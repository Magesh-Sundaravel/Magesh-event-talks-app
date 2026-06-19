import os
import time
import requests
import xml.etree.ElementTree as ET
from bs4 import BeautifulSoup
from flask import Flask, render_template, jsonify, request

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

# In-memory cache
feed_cache = {
    'items': [],
    'last_updated': 0
}
CACHE_DURATION = 300  # 5 minutes cache

def parse_html_content(html_content, date_str, updated_str, link_str):
    """
    Parses the Atom entry HTML content which contains BigQuery release items
    grouped under <h3> tags (e.g. <h3>Feature</h3>, <h3>Issue</h3>).
    """
    if not html_content:
        return []

    soup = BeautifulSoup(html_content, 'html.parser')
    h3_tags = soup.find_all('h3')
    
    parsed_items = []
    
    if not h3_tags:
        # If no h3 tags are found, treat the whole content as a single update
        text_content = soup.get_text().strip()
        parsed_items.append({
            'date': date_str,
            'updated': updated_str,
            'link': link_str,
            'type': 'General',
            'html': str(soup),
            'text': text_content
        })
        return parsed_items

    # Walk through the children of the soup body
    current_type = None
    current_elements = []
    
    for child in soup.contents:
        if child.name == 'h3':
            if current_type is not None:
                # Compile previous block
                item_html = "".join([str(x) for x in current_elements])
                item_soup = BeautifulSoup(item_html, 'html.parser')
                item_text = item_soup.get_text().strip()
                parsed_items.append({
                    'date': date_str,
                    'updated': updated_str,
                    'link': link_str,
                    'type': current_type,
                    'html': item_html,
                    'text': item_text
                })
                current_elements = []
            current_type = child.get_text().strip()
        else:
            current_elements.append(child)
            
    # Don't forget the last one
    if current_type is not None:
        item_html = "".join([str(x) for x in current_elements])
        item_soup = BeautifulSoup(item_html, 'html.parser')
        item_text = item_soup.get_text().strip()
        parsed_items.append({
            'date': date_str,
            'updated': updated_str,
            'link': link_str,
            'type': current_type,
            'html': item_html,
            'text': item_text
        })
        
    return parsed_items

def fetch_feed():
    """
    Fetches the BigQuery Release Notes RSS/Atom feed and parses it.
    """
    response = requests.get(FEED_URL, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}, timeout=15)
    response.raise_for_status()
    
    root = ET.fromstring(response.content)
    namespaces = {'atom': 'http://www.w3.org/2005/Atom'}
    
    all_release_items = []
    
    # In Atom, elements are usually inside the Atom namespace
    for entry in root.findall('atom:entry', namespaces):
        # Title of the entry (the date, e.g., "June 17, 2026")
        title_elem = entry.find('atom:title', namespaces)
        date_str = title_elem.text if title_elem is not None else "Unknown Date"
        
        # Updated timestamp
        updated_elem = entry.find('atom:updated', namespaces)
        updated_str = updated_elem.text if updated_elem is not None else ""
        
        # Link
        link_elem = entry.find('atom:link[@rel="alternate"]', namespaces)
        link_str = link_elem.get('href') if link_elem is not None else "https://cloud.google.com/bigquery/docs/release-notes"
        
        # Content (HTML wrapped in CDATA)
        content_elem = entry.find('atom:content', namespaces)
        html_content = content_elem.text if content_elem is not None else ""
        
        # Parse items inside the HTML content
        items = parse_html_content(html_content, date_str, updated_str, link_str)
        all_release_items.extend(items)
        
    return all_release_items

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases')
def get_releases():
    force = request.args.get('refresh', 'false').lower() == 'true'
    now = time.time()
    
    error_msg = None
    
    # Check if we should update the cache
    if force or not feed_cache['items'] or (now - feed_cache['last_updated'] > CACHE_DURATION):
        try:
            items = fetch_feed()
            feed_cache['items'] = items
            feed_cache['last_updated'] = now
        except Exception as e:
            error_msg = str(e)
            # If fetch fails but we have cached data, fall back to cache
            if not feed_cache['items']:
                return jsonify({
                    'status': 'error',
                    'message': f"Failed to fetch release notes: {error_msg}"
                }), 500
                
    return jsonify({
        'status': 'success' if not error_msg else 'warning',
        'message': error_msg if error_msg else 'Data retrieved successfully',
        'data': feed_cache['items'],
        'last_updated': time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(feed_cache['last_updated'])),
        'cached': not (force and not error_msg)
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
