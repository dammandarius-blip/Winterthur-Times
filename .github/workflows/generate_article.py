import requests
import feedparser
import base64
import datetime
import os

RSS_FEEDS = [
    "https://www.reuters.com/rssFeed/worldNews",
    "https://rss.nytimes.com/services/xml/rss/nyt/World.xml",
    "https://www.tagesschau.de/xml/rss2"
]

def get_latest_news():
    articles = []
    for feed in RSS_FEEDS:
        data = feedparser.parse(feed)
        for entry in data.entries[:5]:
            articles.append(entry.title)
    return articles

def generate_article(topic):
    api_key = os.getenv("DEEPSEEK_API_KEY")
    url = "https://api.deepseek.com/v1/chat/completions"

    payload = {
        "model": "deepseek-chat",
        "messages": [
            {"role": "system", "content": "Schreibe einen journalistischen Zeitungsartikel."},
            {"role": "user", "content": f"Schreibe einen vollständigen Zeitungsartikel über folgendes Thema: {topic}"}
        ]
    }

    headers = {"Authorization": f"Bearer {api_key}"}
    response = requests.post(url, json=payload, headers=headers)
    return response.json()["choices"][0]["message"]["content"]

def generate_image(topic):
    token = os.getenv("HUGGINGFACE_TOKEN")
    url = "https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell"

    headers = {"Authorization": f"Bearer {token}"}
    payload = {"inputs": f"newspaper article illustration about: {topic}"}

    response = requests.post(url, headers=headers, json=payload)
    return response.content

def save_article_html(title, article_text, image_filename):
    today = datetime.date.today().isoformat()
    filename = f"artikel_{today}.html"

    html = f"""
    <html>
    <head>
        <meta charset="UTF-8">
        <title>{title}</title>
    </head>
    <body>
        <h1>{title}</h1>
        <img src="images/{image_filename}" width="600">
        <p>{article_text.replace("\n", "<br>")}</p>
    </body>
    </html>
    """

    with open(filename, "w", encoding="utf-8") as f:
        f.write(html)

def main():
    news = get_latest_news()
    topic = news[0] if news else "Aktuelle Weltnachrichten"

    print("Thema:", topic)

    article = generate_article(topic)
    image_data = generate_image(topic)

    today = datetime.date.today().isoformat()
    image_filename = f"title_{today}.png"

    os.makedirs("images", exist_ok=True)
    with open(f"images/{image_filename}", "wb") as img:
        img.write(image_data)

    save_article_html(topic, article, image_filename)

if __name__ == "__main__":
    main()
