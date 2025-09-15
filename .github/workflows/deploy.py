import os

# Customize these values
github_username = "awelchmatc"
repo_name = "html-embeds"
base_url = f"https://{github_username}.github.io/{repo_name}/"

# Folder containing HTML files
html_folder = "html"

# List all HTML files and generate URLs
public_urls = {}
for file in os.listdir(html_folder):
    if file.endswith(".html"):
        encoded_name = file.replace(" ", "%20")
        public_urls[file] = base_url + encoded_name

# Output the URLs
for name, url in public_urls.items():
    print(f"{name}: {url}")
