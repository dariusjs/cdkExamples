from fastapi import FastAPI
from fastapi.responses import StreamingResponse
import asyncio
import os
import random

app = FastAPI()


async def streamer():
    for i in range(10):
        await asyncio.sleep(1)
        n = random.random()
        s = f"This is streaming from Lambda {n} \n"
        yield bytes(s, encoding="raw_unicode_escape")


@app.get("/")
async def index():
    return StreamingResponse(streamer(), media_type="text/plain; charset=utf-8")
