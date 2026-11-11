# Backup e Recuperação — CAPI

## Railway PostgreSQL

### Backups Automáticos

Railway oferece snapshots automáticos. Para ativar:

1. Acesse o serviço PostgreSQL no Railway Dashboard
2. Settings → Backups → Enable automated backups
3. Configure retenção: mínimo 7 dias

### Backup Manual

```bash
# Exportar dump do banco
pg_dump $DATABASE_URL --format=custom --file=backup_$(date +%Y%m%d_%H%M%S).dump

# Restaurar de um dump
pg_restore --dbname=$DATABASE_URL backup_20261109_120000.dump
```

### RTO e RPO

- **RPO (Recovery Point Objective):** 24 horas (com backups diários)
- **RTO (Recovery Time Objective):** 1 hora (restore de snapshot Railway)

### Procedimento de Recovery

1. Acesse Railway Dashboard → PostgreSQL → Backups
2. Selecione o snapshot desejado
3. Click "Restore"
4. Verifique: `GET /health` deve retornar 200
5. Verifique: dados mais recentes presentes no dashboard

### Testes de Backup

Restaurar backup em staging 1x/mês para validar integridade.
