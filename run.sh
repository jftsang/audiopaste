#!/bin/bash
npm install
npm run build
python -m pip install -r requirements.txt
python -m backend.app
