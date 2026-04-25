import json, requests
from fetch_github import GRAPHQL_HEADERS, GRAPHQL_URL

query = """
query($query: String!, $first: Int!) {
  search(type: USER, query: $query, first: $first) {
    userCount
    edges { node { ... on User { login followers { totalCount } } } }
  }
}
"""
payload = {"query": query, "variables": {"query": "location:Spain sort:followers-desc", "first": 100}}
r = requests.post(GRAPHQL_URL, headers=GRAPHQL_HEADERS, json=payload, timeout=30)
print("Status:", r.status_code)
data = r.json()
if data.get("errors"):
    print("Errors:", data["errors"])
else:
    search = data.get("data", {}).get("search", {})
    print("userCount total en GitHub:", search.get("userCount"))
    edges = search.get("edges", [])
    print("edges devueltos en esta llamada:", len(edges))
    for i, e in enumerate(edges[:5]):
        node = e.get("node", {})
        print(f"  {i+1}. {node.get('login')} - {node.get('followers', {}).get('totalCount')} followers")
