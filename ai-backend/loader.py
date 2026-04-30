import os

def load_files(folder="codebase"):
    docs = []

    for filename in os.listdir(folder):
        path = os.path.join(folder, filename)

        if filename.endswith((".js", ".html")):
            with open(path, "r", encoding="utf-8") as f:
                docs.append(f.read())

    return docs


def split_text(text, size=400):
    return [text[i:i+size] for i in range(0, len(text), size)]
