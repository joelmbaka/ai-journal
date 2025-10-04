from crewai import LLM
import os
from dotenv import load_dotenv

load_dotenv()

gpt_oss_20b = LLM(
    model="openai/gpt-oss-20b-instruct",
    temperature=0.7,
    api_key=os.getenv("NVIDIA_NIM_API_KEY"),
    base_url="https://integrate.api.nvidia.com/v1"
)

llama_70b = LLM(
    model="meta/llama-3.3-70b-instruct",
    temperature=0.3,
    api_key=os.getenv("NVIDIA_NIM_API_KEY"),
    base_url="https://integrate.api.nvidia.com/v1"
)

llama_scout = LLM(
    model="meta/llama-4-scout-17b-16e-instruct",
    temperature=0.7,
    api_key=os.getenv("NVIDIA_NIM_API_KEY"),
    base_url="https://integrate.api.nvidia.com/v1"
)

llama_maverick = LLM(
    model="meta/llama-4-maverick-17b-128e-instruct",
    temperature=0.7,
    api_key=os.getenv("NVIDIA_NIM_API_KEY"),
    base_url="https://integrate.api.nvidia.com/v1"
)