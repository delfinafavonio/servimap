const hasRole = (usuario, roles) => Boolean(usuario && roles.includes(usuario.rol));
module.exports = { hasRole };
