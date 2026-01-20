docker compose -f docker compose.full.yml up -d
```

### Production

```bash
# Full setup with all services
docker compose -f docker compose.full.yml --profile production up -d
```

## Security Best Practices

1. **Network isolation** - Services only accessible within network
2. **Redis authentication** - Add password in production
3. **Nginx security headers** - XSS, clickjacking protection
4. **Regular updates** - Keep images updated
5. **Volume permissions** - Restrict access to sensitive data
6. **Environment variables** - Never commit `.env`
7. **SSL/TLS** - Always use HTTPS in production
