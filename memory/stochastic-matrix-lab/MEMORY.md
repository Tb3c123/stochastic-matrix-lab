# Tier 2 Memory

## Pinned Facts

## Learned Observations
- [2026-11-23] Chạy pytest backend trong python:3.11-slim với /src:ro copy vào /tmp/app và DATABASE_URL=sqlite+aiosqlite:////tmp/test_sml.db để tránh nghẽn fsync SQLite trên USB HDD /mnt/disk1 (33/33 pass trong ~4s).
- [2026-11-23] Deploy CasaOS dùng cổng 3080:3000 (vietlot-frontend) và 8088:8000 (vietlot-backend) vì 3000 bị adguard-home và 8000 bị portainer chiếm; frontend/src/config/api.ts tự suy ra hostname:8088 khi truy cập qua LAN.
