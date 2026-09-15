import './Login.css';

function Login() {
  return (
    <div className="login-screen">
      <div className="login-hero">
        <h1 className="login-logo">ServiMap</h1>
        <p className="login-tagline">El profesional que buscás, más cerca de lo que pensás</p>
        <svg className="login-skyline" viewBox="0 0 500 140" fill="none">
          <path
            d="M0 140 L0 110 L30 110 L30 90 L50 70 L70 90 L70 110 L100 110 L100 60 L120 60 L120 80 L140 80 L140 40 L150 30 L160 40 L160 80 L180 80 L180 100 L210 100 L210 70 L230 70 L230 50 L250 50 L250 90 L270 90 L270 110 L300 110 L300 130 L330 130 L330 90 L350 90 L350 70 L360 60 L370 70 L370 90 L390 90 L390 130 L500 130 L500 140 Z"
            stroke="#C98A93"
            strokeWidth="2"
          />
        </svg>
      </div>

      <div className="login-form-panel">
        <h2>Empezá a usar ServiMap</h2>

        <div className="login-role-cards">
          <button className="login-role-card">
            <strong>Soy Cliente</strong>
            <span>Busco un servicio</span>
          </button>
          <button className="login-role-card">
            <strong>Soy Prestador</strong>
            <span>Ofrezco un oficio</span>
          </button>
        </div>

        <input type="email" placeholder="nombre@correo.com" className="login-input" />
        <input type="password" placeholder="••••••••••" className="login-input" />

        <button className="login-btn login-btn-primary">Ingresar</button>
        <button className="login-btn login-btn-secondary">Crear cuenta</button>
      </div>
    </div>
  );
}

export default Login;