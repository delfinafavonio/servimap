DROP INDEX IF EXISTS "usuarios_email_key";

CREATE UNIQUE INDEX "usuarios_email_rol_key" ON "usuarios"("email", "rol");
