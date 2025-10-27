import {Hono} from 'hono';
import {jsxRenderer} from 'hono/jsx-renderer';
import {getCookie} from 'hono/cookie';
import {authMiddleware} from '../middlewares/authMiddleware';
import {formatExpiryTime} from "../helpers/formatExpiryTime";
import {jwtService} from "@/servicies/JwtService";
import {auth0Service} from "@/servicies/auth0Service";

export const frontendRouter = new Hono();


frontendRouter.use('*', jsxRenderer(({children}) => (
  <html>
  <head>
    <title>My App</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet"/>
    <style>{`
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body {
        font-family: 'Inter', sans-serif;
        background-color: #f5f5f5;
        color: #333;
        line-height: 1.6;
      }
      .container {
        max-width: 1000px;
        margin: 0 auto;
        padding: 40px 20px;
      }
      .card {
        background: white;
        border-radius: 12px;
        padding: 24px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.05);
      }
      .form {
        display: flex;
        flex-direction: column;
        gap: 16px;
        max-width: 400px;
      }
      input {
        padding: 12px;
        border: 1px solid #e0e0e0;
        border-radius: 6px;
        font-size: 15px;
        transition: border-color 0.2s;
      }
      input:focus {
        outline: none;
        border-color: #2563eb;
      }
      button {
        background: #2563eb;
        color: white;
        border: none;
        padding: 12px 20px;
        border-radius: 6px;
        font-weight: 500;
        cursor: pointer;
        transition: background-color 0.2s;
      }
      button:hover {
        background: #1d4ed8;
      }
      .error { color: #dc2626; }
      .success { color: #16a34a; }
      h1 { 
        font-size: 32px;
        margin-bottom: 32px;
        color: #1e293b;
      }
      h2 {
        font-size: 24px;
        margin-bottom: 20px;
        color: #334155;
      }
      .profile-section {
        display: grid;
        grid-template-columns: 250px 1fr;
        gap: 32px;
      }
      .profile-image {
        width: 150px;
        height: 150px;
        border-radius: 75px;
        object-fit: cover;
        margin-bottom: 20px;
      }
      .info-grid {
        display: grid;
        grid-template-columns: auto 1fr;
        gap: 8px 16px;
        align-items: center;
      }
      .info-label {
        color: #64748b;
        font-weight: 500;
      }
      .info-value {
        color: #334155;
      }
      .token-status {
        margin-top: 24px;
        padding-top: 24px;
        border-top: 1px solid #e5e7eb;
      }
      .logout-btn {
        background: #ef4444;
      }
      .logout-btn:hover {
        background: #dc2626;
      }
      .refresh-btn {
        background: #22c55e;
      }
      .refresh-btn:hover {
        background: #16a34a;
      }
    `}</style>
  </head>
  <body>
  <div class="container">{children}</div>
  </body>
  </html>
)));

frontendRouter.use('/dashboard', authMiddleware).get(async (c) => {
  const accessToken = c.get('access_token_decoded');

  const user = await auth0Service.getUserInfo(accessToken)

  const expiresAt = Number(getCookie(c, 'expires_at'));
  const formattedExpiryTime = formatExpiryTime(expiresAt);

  return c.render(
    <div>
      <h1>Welcome back, {user.name}</h1>
      <div class="card">
        <div class="profile-section">
          <div>
            <img src={user.picture} alt="Profile" class="profile-image"/>
            <form action="/auth/logout" method="post">
              <button type="submit" class="logout-btn">Sign Out</button>
            </form>
          </div>

          <div>
            <h2>Profile Information</h2>
            <div class="info-grid">
              <span class="info-label">Name:</span>
              <span class="info-value">{user.name}</span>

              <span class="info-label">Email:</span>
              <span class="info-value">{user.email}</span>

              <span class="info-label">Email Status:</span>
              <span class="info-value">
                {user.email_verified ?
                  <span style={{color: '#16a34a'}}>✓ Verified</span> :
                  <span style={{color: '#dc2626'}}>Not Verified</span>
                }
              </span>

              <span class="info-label">User ID:</span>
              <span class="info-value" style={{fontSize: '14px', fontFamily: 'monospace'}}>{user.sub}</span>
            </div>

            <div class="token-status">
              <h2>Session Status</h2>
              <p style={{marginBottom: '16px'}}>
                <span class="info-label">Token expires in: </span>
                <span class="info-value">{formattedExpiryTime}</span>
              </p>
              <form action="/auth/refresh" method="GET">
                <button type="submit" class="refresh-btn">Refresh Session</button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

frontendRouter.get('/', async (c) => {
  const accessToken = getCookie(c, 'access_token');

  if (accessToken) {
    return c.redirect('/dashboard');
  }

  return c.render(
    <div>
      <h1>Welcome</h1>
      <div style={{display: 'flex', gap: '40px'}}>
        <div>
          <h2>Login</h2>
          <form class="form" action="/auth/login" method="post">
            <input type="email" name="email" placeholder="Email" required/>
            <input type="password" name="password" placeholder="Password" required/>
            <button type="submit">Login</button>
          </form>
        </div>

        <div>
          <h2>Sign Up</h2>
          <form class="form" action="/auth/signup" method="post">
            <input type="text" name="name" placeholder="Name" required/>
            <input type="email" name="email" placeholder="Email" required/>
            <input type="password" name="password" placeholder="Password" required/>
            <button type="submit">Sign Up</button>
          </form>
        </div>
      </div>
    </div>
  );
});


frontendRouter.get('/redirect', async (c) => {
  const message = c.req.query('message') || 'An error occurred';
  const style = c.req.query('style') || 'error';
  const destination = c.req.query('destination') || '/';
  const isSuccess = style === 'success';

  return c.render(
    <div style={{textAlign: 'center', paddingTop: '60px'}}>
      <div class="card" style={{maxWidth: '500px', margin: '0 auto'}}>
        <svg
          width="64"
          height="64"
          viewBox="0 0 24 24"
          fill="none"
          stroke={isSuccess ? '#16a34a' : '#ef4444'}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{marginBottom: '24px'}}
        >
          {isSuccess ? (
            <path d="M20 6L9 17l-5-5"/>
          ) : (
            <>
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </>
          )}
        </svg>

        <h1 style={{
          fontSize: '28px',
          marginBottom: '16px',
          color: '#1e293b'
        }}>{isSuccess ? 'Success' : 'Error'}</h1>

        <p style={{
          color: isSuccess ? '#16a34a' : '#64748b',
          marginBottom: '24px',
          fontSize: '16px'
        }}>{decodeURIComponent(message)}</p>

        <div style={{
          background: isSuccess ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${isSuccess ? '#dcfce7' : '#fee2e2'}`,
          borderRadius: '6px',
          padding: '12px',
          marginBottom: '24px',
          color: isSuccess ? '#15803d' : '#991b1b',
          fontSize: '14px'
        }}>
          Redirecting in 3 seconds...
        </div>

        <meta httpEquiv="refresh" content={`3;url=${destination}`}/>

        <a
          href={destination}
          style={{
            display: 'inline-block',
            color: '#2563eb',
            textDecoration: 'none',
            fontWeight: '500',
            fontSize: '15px',
            transition: 'color 0.2s'
          }}
          onMouseOver="this.style.color='#1d4ed8'"
        >
          Click here if you are not redirected automatically
        </a>
      </div>
    </div>
  );
});
