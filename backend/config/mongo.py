import os

from dotenv import load_dotenv
from mongoengine import connect

load_dotenv()


def initialize_mongodb():
    connect(
        db=os.getenv("MONGODB_DATABASE"),
        host=os.getenv("MONGODB_URI"),
    )