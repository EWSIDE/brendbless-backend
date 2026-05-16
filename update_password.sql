-- Сначала найдем пользователя и обновим ему пароль
UPDATE User SET password = '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYqYo5P7GGe' WHERE email = 'enveels@mail.ru';
