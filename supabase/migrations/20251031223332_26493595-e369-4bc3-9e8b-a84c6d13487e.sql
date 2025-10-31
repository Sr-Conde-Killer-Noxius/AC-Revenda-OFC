-- Atualizar rota de Gerenciar Revendedores de /revenda para /users
UPDATE page_access_control 
SET 
  page_url = '/users',
  page_key = 'users',
  updated_at = now()
WHERE page_url = '/revenda';