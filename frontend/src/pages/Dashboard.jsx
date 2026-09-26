import { Link } from 'react-router-dom';
import { useAuth } from '../context/auth-context';
const content = {
  CLIENTE: { title: '¿Qué necesitás resolver hoy?', text: 'Buscá por oficio o zona, compará perfiles y enviá una solicitud.', actions: [['/app/buscar', 'Buscar profesionales'], ['/app/solicitudes', 'Ver mis solicitudes']] },
  PRESTADOR: { title: 'Tu trabajo, más cerca de nuevos clientes', text: 'Mantené tu perfil y disponibilidad al día para aparecer en el mapa.', actions: [['/app/perfil', 'Completar mi perfil'], ['/app/solicitudes', 'Gestionar solicitudes']] },
  ADMINISTRADOR: { title: 'Panel de administración', text: 'Gestioná el catálogo de oficios y la visibilidad de las reseñas.', actions: [['/app/admin/oficios', 'Administrar oficios'], ['/app/admin/resenas', 'Moderar reseñas']] },
};
export default function Dashboard() { const { usuario } = useAuth(); const data = content[usuario.rol]; return <section className="dashboard-hero"><span className="eyebrow">Hola, {usuario.nombre}</span><h1>{data.title}</h1><p>{data.text}</p><div className="button-row">{data.actions.map(([to, label], index) => <Link key={to} className={`button ${index ? 'secondary' : 'primary'}`} to={to}>{label}</Link>)}</div></section>; }
