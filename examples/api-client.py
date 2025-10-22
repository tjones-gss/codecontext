"""
CodeContext Live API Client - Python
Simple Python client for interacting with CodeContext Live API
"""

import requests
from typing import List, Dict, Optional
import json


class CodeContextClient:
    """Client for CodeContext Live API"""

    def __init__(self, base_url: str = "http://localhost:3000"):
        """
        Initialize the client

        Args:
            base_url: Base URL of the CodeContext Live server
        """
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})

    def get_context(self, file_path: str) -> Dict:
        """
        Get structured context for a file

        Args:
            file_path: Path to the file

        Returns:
            Context digest dictionary
        """
        response = self.session.post(
            f"{self.base_url}/api/context",
            json={"filePath": file_path}
        )
        response.raise_for_status()
        return response.json()["data"]

    def get_context_markdown(self, file_path: str) -> str:
        """
        Get Markdown-formatted context summary

        Args:
            file_path: Path to the file

        Returns:
            Markdown summary string
        """
        response = self.session.post(
            f"{self.base_url}/api/context/markdown",
            json={"filePath": file_path}
        )
        response.raise_for_status()
        return response.json()["data"]

    def analyze_file(self, file_path: str) -> str:
        """
        Manually trigger analysis for a file

        Args:
            file_path: Path to the file

        Returns:
            Markdown summary string
        """
        response = self.session.post(
            f"{self.base_url}/api/analyze",
            json={"filePath": file_path}
        )
        response.raise_for_status()
        return response.json()["data"]

    def search(self, query: str, top_k: int = 5) -> List[Dict]:
        """
        Search the vector store

        Args:
            query: Search query
            top_k: Number of results to return

        Returns:
            List of search results
        """
        response = self.session.post(
            f"{self.base_url}/api/search",
            json={"query": query, "topK": top_k}
        )
        response.raise_for_status()
        return response.json()["data"]

    def index_codebase(self, directories: List[str]) -> Dict:
        """
        Index codebase directories

        Args:
            directories: List of directory paths to index

        Returns:
            Indexing status
        """
        response = self.session.post(
            f"{self.base_url}/api/index",
            json={"directories": directories}
        )
        response.raise_for_status()
        return response.json()

    def get_config(self) -> Dict:
        """
        Get server configuration

        Returns:
            Configuration dictionary
        """
        response = self.session.get(f"{self.base_url}/api/config")
        response.raise_for_status()
        return response.json()["data"]

    def health_check(self) -> Dict:
        """
        Check server health

        Returns:
            Health status dictionary
        """
        response = self.session.get(f"{self.base_url}/health")
        response.raise_for_status()
        return response.json()


def main():
    """Example usage"""
    client = CodeContextClient("http://localhost:3000")

    try:
        # Health check
        print("Checking server health...")
        health = client.health_check()
        print(f"Server status: {health['status']}")

        # Get configuration
        print("\nGetting configuration...")
        config = client.get_config()
        print(f"Config: {json.dumps(config, indent=2)}")

        # Analyze a file
        print("\nAnalyzing file...")
        file_path = "./examples/sample-files/SCR100.cbl"
        markdown = client.get_context_markdown(file_path)
        print("\n" + markdown)

        # Search for related code
        print("\nSearching for related code...")
        results = client.search("customer update", 3)
        print(f"Found {len(results)} related files")
        for i, result in enumerate(results, 1):
            print(f"{i}. {result['metadata']['fileName']}")

    except requests.exceptions.RequestException as e:
        print(f"Error: {e}")


if __name__ == "__main__":
    main()
