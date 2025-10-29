-- Remove o cron job PostgreSQL que está causando os erros
-- Este job estava tentando usar current_setting('app.settings.cron_secret') que não existe
SELECT cron.unschedule(1);