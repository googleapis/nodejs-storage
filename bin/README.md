# benchwrapper

benchwrapper is a lightweight gRPC server that wraps the storage library for
bencharmking purposes.

## Running

```
npm install -g typescript
cd nodejs-storage
npm install
export STORAGE_EMULATOR_HOST=http://localhost:8080
npm run benchwrapper -- --port 8081
```