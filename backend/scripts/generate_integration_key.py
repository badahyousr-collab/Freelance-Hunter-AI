"""Print a Fernet key for local .env or a production secret manager."""
from cryptography.fernet import Fernet

if __name__ == "__main__":
    print(Fernet.generate_key().decode("ascii"))
    print("Store this key securely. Losing it makes saved integration credentials undecryptable.")
