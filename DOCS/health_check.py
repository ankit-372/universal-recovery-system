import urllib.request
try:
    resp = urllib.request.urlopen("https://core-backend-yzhp.onrender.com/items/image/proxy?url=https://res.cloudinary.com")
    print(resp.status)
except Exception as e:
    print(e)
