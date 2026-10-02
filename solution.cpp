#include <iostream>
#include <string>
#include <vector>
#include <cmath>
#include <sstream>
#include <algorithm>
#include <json/json.h>
#include <limits>
#include <numeric>

using namespace std;

double WHX, WHY;
double MAX_ENERGY = 500.0;

struct Drone {
    string id;
    double max_payload;
    double current_time = 0.0;
    double cx, cy;
    Json::Value path = Json::arrayValue;
    bool exhausted = false;
};

struct Delivery {
    string id;
    double x, y;
    double weight;
    double deadline;
    bool assigned = false;
};

struct NFZ {
    string type;
    double t_start, t_end;
    double cx, cy, r;
    double min_x, min_y, max_x, max_y;
};

struct SpatialOverlap {
    double d_in, d_out;
    double t_start, t_end;
};

vector<NFZ> g_nfzs;

inline double getDist(double x1, double y1, double x2, double y2) {
    double dx = x1 - x2, dy = y1 - y2;
    return sqrt(dx * dx + dy * dy);
}

bool intersectCircle(double x1, double y1, double x2, double y2,
                     const NFZ& nfz, double& d_in, double& d_out) {
    double dx = x2 - x1, dy = y2 - y1;
    double fx = x1 - nfz.cx, fy = y1 - nfz.cy;
    double a = dx * dx + dy * dy;
    double b = 2.0 * (fx * dx + fy * dy);
    double c = fx * fx + fy * fy - nfz.r * nfz.r;
    if (a < 1e-12) {
        if (c <= 0) { d_in = d_out = 0; return true; }
        return false;
    }
    double disc = b * b - 4.0 * a * c;
    if (disc < 0) return false;
    disc = sqrt(disc);
    double t1 = (-b - disc) / (2.0 * a);
    double t2 = (-b + disc) / (2.0 * a);
    if (t1 > 1.0 || t2 < 0.0) return false;
    t1 = max(0.0, t1);
    t2 = min(1.0, t2);
    double total = sqrt(a);
    d_in  = t1 * total;
    d_out = t2 * total;
    return true;
}

bool intersectRect(double x1, double y1, double x2, double y2,
                   const NFZ& nfz, double& d_in, double& d_out) {
    double t_min = 0.0, t_max = 1.0;
    double dx = x2 - x1, dy = y2 - y1;
    if (abs(dx) < 1e-9) {
        if (x1 < nfz.min_x || x1 > nfz.max_x) return false;
    } else {
        double tx1 = (nfz.min_x - x1) / dx;
        double tx2 = (nfz.max_x - x1) / dx;
        if (tx1 > tx2) swap(tx1, tx2);
        t_min = max(t_min, tx1);
        t_max = min(t_max, tx2);
    }
    if (abs(dy) < 1e-9) {
        if (y1 < nfz.min_y || y1 > nfz.max_y) return false;
    } else {
        double ty1 = (nfz.min_y - y1) / dy;
        double ty2 = (nfz.max_y - y1) / dy;
        if (ty1 > ty2) swap(ty1, ty2);
        t_min = max(t_min, ty1);
        t_max = min(t_max, ty2);
    }
    if (t_min > t_max) return false;
    double total = sqrt(dx * dx + dy * dy);
    d_in  = t_min * total;
    d_out = t_max * total;
    return true;
}

vector<SpatialOverlap> getOverlaps(double x1, double y1, double x2, double y2) {
    vector<SpatialOverlap> overlaps;
    for (const auto& nfz : g_nfzs) {
        double d_in = 0, d_out = 0;
        bool hits = (nfz.type == "circle")
            ? intersectCircle(x1, y1, x2, y2, nfz, d_in, d_out)
            : intersectRect(x1, y1, x2, y2, nfz, d_in, d_out);
        if (hits) {
            overlaps.push_back({d_in, d_out, nfz.t_start, nfz.t_end});
        }
    }
    return overlaps;
}

double getSafeDeparture(double t_ready, const vector<SpatialOverlap>& overlaps) {
    if (overlaps.empty()) return t_ready;
    double t_dep = t_ready;
    bool safe = false;
    int iters = 0;
    while (!safe && iters < 10000) {
        safe = true;
        iters++;
        for (const auto& o : overlaps) {
            double t_enter = t_dep + o.d_in;
            double t_exit  = t_dep + o.d_out;
            if (t_enter <= o.t_end && t_exit >= o.t_start) {
                double new_dep = o.t_end - o.d_in + 0.001;
                if (new_dep > t_dep) {
                    t_dep = new_dep;
                    safe = false;
                    break;
                }
            }
        }
    }
    return t_dep;
}

double routeEnergy(const vector<int>& batch, const vector<Delivery>& dels) {
    if (batch.empty()) return 0;
    double total_w = 0;
    for (int i : batch) total_w += dels[i].weight;
    double energy = 0, px = WHX, py = WHY, rem = total_w;
    for (int i : batch) {
        double d = getDist(px, py, dels[i].x, dels[i].y);
        energy += d * (1.0 + rem);
        rem -= dels[i].weight;
        px = dels[i].x;
        py = dels[i].y;
    }
    energy += getDist(px, py, WHX, WHY) * 1.0;
    return energy;
}

bool routeTiming(const vector<int>& batch, const vector<Delivery>& dels,
                 double t0,
                 vector<double>& arr, vector<double>& dep,
                 double& ret_dep, double& ret_time) {
    arr.clear(); dep.clear();
    double px = WHX, py = WHY, t = t0;
    for (int idx : batch) {
        double d = getDist(px, py, dels[idx].x, dels[idx].y);
        auto ov = getOverlaps(px, py, dels[idx].x, dels[idx].y);
        double td = getSafeDeparture(t, ov);
        double a  = td + d;
        if (a > dels[idx].deadline) return false;
        dep.push_back(td);
        arr.push_back(a);
        px = dels[idx].x; py = dels[idx].y; t = a;
    }
    auto ov = getOverlaps(px, py, WHX, WHY);
    ret_dep  = getSafeDeparture(t, ov);
    ret_time = ret_dep + getDist(px, py, WHX, WHY);
    return true;
}

vector<int> buildBatch(const Drone& drone, const vector<Delivery>& dels,
                       double& out_ret_time) {
    vector<int> batch;
    vector<bool> in_batch(dels.size(), false);
    double cx = WHX, cy = WHY;
    double ct = drone.current_time;
    double cargo = 0;
    double energy_legs = 0;
    double total_leg_dist = 0;

    while (true) {
        int best_idx = -1;
        double best_score = -1e18;

        for (int i = 0; i < (int)dels.size(); i++) {
            if (dels[i].assigned || in_batch[i]) continue;
            if (cargo + dels[i].weight > drone.max_payload) continue;

            double d = getDist(cx, cy, dels[i].x, dels[i].y);
            auto ov = getOverlaps(cx, cy, dels[i].x, dels[i].y);
            double td = getSafeDeparture(ct, ov);
            double arrival = td + d;
            if (arrival > dels[i].deadline) continue;

            double new_energy_legs = energy_legs
                                   + total_leg_dist * dels[i].weight
                                   + d * (1.0 + dels[i].weight);
            double new_return_dist = getDist(dels[i].x, dels[i].y, WHX, WHY);
            double total_energy = new_energy_legs + new_return_dist * 1.0;
            if (total_energy > MAX_ENERGY) continue;

            double slack = dels[i].deadline - arrival;
            double urgency = 1.0 / (slack + 1.0);
            double proximity = 1.0 / (d + 0.1);
            double wait_pen = (td - ct);
            double wh_dist = getDist(dels[i].x, dels[i].y, WHX, WHY);

            double score = 12.0 * urgency
                         + 6.0 * proximity
                         - 0.05 * wh_dist
                         - 0.3 * wait_pen;

            if (score > best_score) {
                best_score = score;
                best_idx = i;
            }
        }

        if (best_idx == -1) break;

        double d = getDist(cx, cy, dels[best_idx].x, dels[best_idx].y);
        auto ov = getOverlaps(cx, cy, dels[best_idx].x, dels[best_idx].y);
        double td = getSafeDeparture(ct, ov);
        double a = td + d;

        energy_legs += total_leg_dist * dels[best_idx].weight
                     + d * (1.0 + dels[best_idx].weight);
        total_leg_dist += d;

        batch.push_back(best_idx);
        in_batch[best_idx] = true;
        cargo += dels[best_idx].weight;
        cx = dels[best_idx].x;
        cy = dels[best_idx].y;
        ct = a;
    }

    if ((int)batch.size() >= 3) {
        bool improved = true;
        while (improved) {
            improved = false;
            for (int i = 0; i < (int)batch.size() - 1 && !improved; i++) {
                for (int j = i + 1; j < (int)batch.size(); j++) {
                    vector<int> nb = batch;
                    reverse(nb.begin() + i, nb.begin() + j + 1);
                    vector<double> a2, d2; double rd2, rt2;
                    if (!routeTiming(nb, dels, drone.current_time, a2, d2, rd2, rt2)) continue;
                    double ne = routeEnergy(nb, dels);
                    if (ne > MAX_ENERGY) continue;
                    vector<double> a1, d1; double rd1, rt1;
                    routeTiming(batch, dels, drone.current_time, a1, d1, rd1, rt1);
                    if (rt2 < rt1 - 0.01) {
                        batch = nb;
                        improved = true;
                        break;
                    }
                }
            }
        }
    }

    if ((int)batch.size() >= 2 && (int)batch.size() <= 6) {
        vector<int> perm = batch;
        sort(perm.begin(), perm.end());
        vector<int> best_perm = batch;
        vector<double> ba, bd; double brd, brt;
        routeTiming(batch, dels, drone.current_time, ba, bd, brd, brt);
        double best_ret = brt;
        do {
            vector<double> a2, d2; double rd2, rt2;
            if (!routeTiming(perm, dels, drone.current_time, a2, d2, rd2, rt2)) continue;
            double e2 = routeEnergy(perm, dels);
            if (e2 > MAX_ENERGY) continue;
            if (rt2 < best_ret - 0.001) {
                best_ret = rt2;
                best_perm = perm;
            }
        } while (next_permutation(perm.begin(), perm.end()));
        batch = best_perm;
    }

    if (!batch.empty()) {
        vector<double> fa, fd; double frd;
        routeTiming(batch, dels, drone.current_time, fa, fd, frd, out_ret_time);
    } else {
        out_ret_time = drone.current_time;
    }

    return batch;
}

Json::Value makeStep(double x, double y, double t, const string& action,
                     const string& d_id = "", const vector<string>& d_ids = {}) {
    Json::Value s;
    s["x"] = x;
    s["y"] = y;
    s["t"] = t;
    s["action"] = action;
    if (action == "PICKUP") {
        Json::Value ids(Json::arrayValue);
        for (const auto& id : d_ids) ids.append(id);
        s["delivery_ids"] = ids;
    } else if (action == "DELIVER") {
        s["delivery_id"] = d_id;
    }
    return s;
}

void emitPath(Drone& drone, const vector<int>& batch, vector<Delivery>& dels) {
    vector<double> arr, dep;
    double ret_dep, ret_time;
    routeTiming(batch, dels, drone.current_time, arr, dep, ret_dep, ret_time);

    vector<string> ids;
    for (int i : batch) ids.push_back(dels[i].id);
    drone.path.append(makeStep(WHX, WHY, drone.current_time, "PICKUP", "", ids));

    if (dep[0] > drone.current_time + 0.001)
        drone.path.append(makeStep(WHX, WHY, dep[0], "WAIT"));

    for (int k = 0; k < (int)batch.size(); k++) {
        int idx = batch[k];
        drone.path.append(makeStep(dels[idx].x, dels[idx].y, arr[k], "DELIVER", dels[idx].id));

        if (k + 1 < (int)batch.size()) {
            if (dep[k + 1] > arr[k] + 0.001)
                drone.path.append(makeStep(dels[idx].x, dels[idx].y, dep[k + 1], "WAIT"));
        } else {
            if (ret_dep > arr[k] + 0.001)
                drone.path.append(makeStep(dels[idx].x, dels[idx].y, ret_dep, "WAIT"));
        }
    }

    drone.path.append(makeStep(WHX, WHY, ret_time, "RETURN"));
    drone.current_time = ret_time;
    drone.cx = WHX;
    drone.cy = WHY;
    for (int i : batch) dels[i].assigned = true;
}

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);

    string input_str((istreambuf_iterator<char>(cin)), istreambuf_iterator<char>());
    Json::Value input_data;
    Json::CharReaderBuilder rb;
    string errs;
    istringstream ss(input_str);
    Json::parseFromStream(rb, ss, &input_data, &errs);

    double mapW = input_data["map_size"][0].asDouble();
    double mapH = input_data["map_size"][1].asDouble();
    WHX = mapW / 2.0;
    WHY = mapH / 2.0;

    if (input_data.isMember("warehouse")) {
        WHX = input_data["warehouse"][0].asDouble();
        WHY = input_data["warehouse"][1].asDouble();
    }
    if (input_data.isMember("max_energy")) {
        MAX_ENERGY = input_data["max_energy"].asDouble();
    }

    vector<Drone> drones;
    for (const auto& d : input_data["drones"]) {
        Drone dr;
        dr.id = d["id"].asString();
        dr.max_payload = d["max_payload"].asDouble();
        dr.current_time = 0;
        dr.cx = WHX; dr.cy = WHY;
        drones.push_back(dr);
    }

    vector<Delivery> deliveries;
    for (const auto& d : input_data["deliveries"]) {
        Delivery dl;
        dl.id = d["id"].asString();
        dl.x = d["x"].asDouble();
        dl.y = d["y"].asDouble();
        dl.weight = d["weight"].asDouble();
        dl.deadline = d["deadline"].asDouble();
        dl.assigned = false;
        deliveries.push_back(dl);
    }

    for (const auto& nz : input_data["no_fly_zones"]) {
        NFZ n;
        n.type = nz["shape"].asString();
        n.t_start = nz["T_start"].asDouble();
        n.t_end = nz["T_end"].asDouble();
        if (n.type == "circle") {
            n.cx = nz["center"][0].asDouble();
            n.cy = nz["center"][1].asDouble();
            n.r = nz["radius"].asDouble();
        } else {
            n.min_x = min(nz["corners"][0][0].asDouble(), nz["corners"][1][0].asDouble());
            n.min_y = min(nz["corners"][0][1].asDouble(), nz["corners"][1][1].asDouble());
            n.max_x = max(nz["corners"][0][0].asDouble(), nz["corners"][1][0].asDouble());
            n.max_y = max(nz["corners"][0][1].asDouble(), nz["corners"][1][1].asDouble());
        }
        g_nfzs.push_back(n);
    }

    for (auto& dl : deliveries) {
        double d = getDist(WHX, WHY, dl.x, dl.y);
        if (d > dl.deadline) { dl.assigned = true; continue; }
        double min_energy = d * (1.0 + dl.weight) + d * 1.0;
        if (min_energy > MAX_ENERGY) { dl.assigned = true; continue; }
        bool any = false;
        for (auto& dr : drones) if (dr.max_payload >= dl.weight) { any = true; break; }
        if (!any) dl.assigned = true;
    }

    {
        vector<int> urgent;
        for (int i = 0; i < (int)deliveries.size(); i++) {
            if (deliveries[i].assigned) continue;
            double d = getDist(WHX, WHY, deliveries[i].x, deliveries[i].y);
            double slack = deliveries[i].deadline - d;
            if (slack < 5.0) urgent.push_back(i);
        }
        sort(urgent.begin(), urgent.end(), [&](int a, int b) {
            return deliveries[a].deadline < deliveries[b].deadline;
        });
        for (int idx : urgent) {
            if (deliveries[idx].assigned) continue;
            int best_d = -1;
            double best_arr = 1e18;
            for (int d = 0; d < (int)drones.size(); d++) {
                if (drones[d].max_payload < deliveries[idx].weight) continue;
                double dist_to = getDist(WHX, WHY, deliveries[idx].x, deliveries[idx].y);
                auto ov = getOverlaps(WHX, WHY, deliveries[idx].x, deliveries[idx].y);
                double td = getSafeDeparture(drones[d].current_time, ov);
                double a = td + dist_to;
                if (a > deliveries[idx].deadline) continue;
                double dist_back = getDist(deliveries[idx].x, deliveries[idx].y, WHX, WHY);
                double energy = dist_to * (1.0 + deliveries[idx].weight) + dist_back;
                if (energy > MAX_ENERGY) continue;
                if (a < best_arr) { best_arr = a; best_d = d; }
            }
            if (best_d == -1) continue;
            vector<int> single = {idx};
            emitPath(drones[best_d], single, deliveries);
        }
    }

    while (true) {
        int best_drone_idx = -1;
        vector<int> best_batch;
        double best_ret = 1e18;
        int best_count = 0;

        for (int d = 0; d < (int)drones.size(); d++) {
            if (drones[d].exhausted) continue;
            double ret;
            vector<int> batch = buildBatch(drones[d], deliveries, ret);
            if (batch.empty()) {
                drones[d].exhausted = true;
                continue;
            }
            int cnt = (int)batch.size();
            if (cnt > best_count || (cnt == best_count && ret < best_ret)) {
                best_drone_idx = d;
                best_batch = batch;
                best_ret = ret;
                best_count = cnt;
            }
        }

        if (best_drone_idx == -1 || best_batch.empty()) break;

        emitPath(drones[best_drone_idx], best_batch, deliveries);
        for (auto& dr : drones) dr.exhausted = false;
    }

    for (int i = 0; i < (int)deliveries.size(); i++) {
        if (deliveries[i].assigned) continue;
        int best_d = -1;
        double best_ret = 1e18;
        for (int d = 0; d < (int)drones.size(); d++) {
            if (drones[d].max_payload < deliveries[i].weight) continue;
            double dist_to = getDist(WHX, WHY, deliveries[i].x, deliveries[i].y);
            double dist_back = getDist(deliveries[i].x, deliveries[i].y, WHX, WHY);
            auto ov1 = getOverlaps(WHX, WHY, deliveries[i].x, deliveries[i].y);
            double td1 = getSafeDeparture(drones[d].current_time, ov1);
            double arr = td1 + dist_to;
            if (arr > deliveries[i].deadline) continue;
            auto ov2 = getOverlaps(deliveries[i].x, deliveries[i].y, WHX, WHY);
            double td2 = getSafeDeparture(arr, ov2);
            double ret = td2 + dist_back;
            double energy = dist_to * (1.0 + deliveries[i].weight) + dist_back;
            if (energy > MAX_ENERGY) continue;
            if (ret < best_ret) { best_ret = ret; best_d = d; }
        }
        if (best_d == -1) continue;

        Drone& drone = drones[best_d];
        double dist_to = getDist(WHX, WHY, deliveries[i].x, deliveries[i].y);
        double dist_back = getDist(deliveries[i].x, deliveries[i].y, WHX, WHY);
        auto ov1 = getOverlaps(WHX, WHY, deliveries[i].x, deliveries[i].y);
        double td1 = getSafeDeparture(drone.current_time, ov1);
        double arr = td1 + dist_to;
        auto ov2 = getOverlaps(deliveries[i].x, deliveries[i].y, WHX, WHY);
        double td2 = getSafeDeparture(arr, ov2);
        double ret = td2 + dist_back;

        drone.path.append(makeStep(WHX, WHY, drone.current_time, "PICKUP", "", {deliveries[i].id}));
        if (td1 > drone.current_time + 0.001)
            drone.path.append(makeStep(WHX, WHY, td1, "WAIT"));
        drone.path.append(makeStep(deliveries[i].x, deliveries[i].y, arr, "DELIVER", deliveries[i].id));
        if (td2 > arr + 0.001)
            drone.path.append(makeStep(deliveries[i].x, deliveries[i].y, td2, "WAIT"));
        drone.path.append(makeStep(WHX, WHY, ret, "RETURN"));

        drone.current_time = ret;
        deliveries[i].assigned = true;
    }

    Json::Value flight_manifest(Json::arrayValue);
    for (const auto& drone : drones) {
        if (!drone.path.empty()) {
            Json::Value entry;
            entry["drone_id"] = drone.id;
            entry["path"] = drone.path;
            flight_manifest.append(entry);
        }
    }

    Json::Value output;
    output["flight_manifest"] = flight_manifest;
    Json::StreamWriterBuilder wb;
    wb["indentation"] = "  ";
    cout << Json::writeString(wb, output) << "\n";

    return 0;
}
