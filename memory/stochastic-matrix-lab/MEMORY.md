# Tier 2 Memory

## Pinned Facts

## Learned Observations
- [2026-11-23] Chạy pytest backend trong python:3.11-slim với /src:ro copy vào /tmp/app và DATABASE_URL=sqlite+aiosqlite:////tmp/test_sml.db để tránh nghẽn fsync SQLite trên USB HDD /mnt/disk1 (33/33 pass trong ~4s).
- [2026-11-23] Deploy CasaOS dùng cổng 3080:3000 (vietlot-frontend) và 8088:8000 (vietlot-backend) vì 3000 bị adguard-home và 8000 bị portainer chiếm; frontend/src/config/api.ts tự suy ra hostname:8088 khi truy cập qua LAN.
- [2026-11-24] In auto_cycle.py, always order SavedTicket with pending status first before id DESC so batch-inserted historical evaluated tickets never shadow upcoming pending Golden Signal tickets.
- [2026-11-24] Offload CPU-bound tournament generations via asyncio.to_thread, cache read endpoints in RAM, and skip per-row audit recomputation on evaluated historical tickets (shrinking /tickets from 5MB/2.5s to <60KB/<3ms).
- [2026-11-24] Enforce VN-time thermal schedule on Morefine N6: Night Boost only 00:30-07:00 capped <=0.35 vCPU (~6-8% host CPU, 0 disk I/O) to protect qBittorrent; Daytime 07:00-00:30 runs Ultra-Eco (<1% CPU) and auto-hibernates at 0% CPU on stagnation.
- [2026-11-24] Never reward total duplicate m6 row count in fitness (reward only distinct 6/6 draws) and enforce cross-row bitwise overlap <=3 in build_deterministic_rows plus <=2 on Hero Banner to prevent head cloning.
- [2026-11-24] Enforce Elastic Population (12 daytime elites <-> 36 night gladiators), mandatory recent_6_draws >= 1 in the 10 latest draws, decaying x0.85 live_prestige from 18:35 real draws, and never delete ticket_origin=='live_real_time'.
- [2026-11-24] Use game-specific horizons (Mega 270d ~117 draws, Power 365d ~156 draws with >=280 seeded DB draws), split 4 heads into 2 recent + 2 full-horizon specialists, and require recent_6_draws>=1 AND winning_draws>=3 before overwriting DB.
