import React from 'react';

export interface MagicLinkEmailProps {
  magicLink?: string;
  recipientEmail?: string;
}

export function MagicLinkEmail({
  magicLink = '{{MAGIC_LINK}}',
  recipientEmail = '{{RECIPIENT_EMAIL}}',
}: MagicLinkEmailProps) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Sign in to Agni</title>
      </head>
      <body
        style={{
          margin: 0,
          padding: 0,
          backgroundColor: '#09090b',
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
          WebkitFontSmoothing: 'antialiased',
          color: '#f4f4f5',
        }}
      >
        <table
          role="presentation"
          width="100%"
          border={0}
          cellSpacing={0}
          cellPadding={0}
          style={{ backgroundColor: '#09090b', padding: '40px 16px' }}
        >
          <tbody>
            <tr>
              <td align="center">
                <table
                  role="presentation"
                  width="100%"
                  border={0}
                  cellSpacing={0}
                  cellPadding={0}
                  style={{
                    maxWidth: '520px',
                    backgroundColor: '#141417',
                    border: '1px solid #27272a',
                    borderRadius: '20px',
                    overflow: 'hidden',
                    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
                  }}
                >
                  <tbody>
                    {/* Top Accent Line */}
                    <tr>
                      <td
                        height={4}
                        style={{
                          background:
                            'linear-gradient(90deg, #f97316 0%, #f59e0b 50%, #eab308 100%)',
                        }}
                      />
                    </tr>

                    {/* Main Content */}
                    <tr>
                      <td style={{ padding: '36px 32px' }}>
                        {/* Brand Logo Header */}
                        <table
                          role="presentation"
                          border={0}
                          cellSpacing={0}
                          cellPadding={0}
                          style={{ marginBottom: '28px' }}
                        >
                          <tbody>
                            <tr>
                              <td
                                style={{
                                  background:
                                    'linear-gradient(135deg, #f97316 0%, #d97706 100%)',
                                  borderRadius: '12px',
                                  width: '40px',
                                  height: '40px',
                                  textAlign: 'center',
                                  verticalAlign: 'middle',
                                  boxShadow:
                                    '0 4px 12px rgba(249, 115, 22, 0.3)',
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: '20px',
                                    lineHeight: '40px',
                                    color: '#ffffff',
                                  }}
                                >
                                  🔥
                                </span>
                              </td>
                              <td style={{ paddingLeft: '12px' }}>
                                <span
                                  style={{
                                    fontSize: '22px',
                                    fontWeight: 800,
                                    letterSpacing: '-0.5px',
                                    color: '#f97316',
                                    display: 'inline-block',
                                  }}
                                >
                                  Agni
                                </span>
                              </td>
                            </tr>
                          </tbody>
                        </table>

                        {/* Personalized Greeting */}
                        <p
                          style={{
                            margin: '0 0 12px 0',
                            fontSize: '16px',
                            fontWeight: 600,
                            color: '#f4f4f5',
                          }}
                        >
                          Hi {recipientEmail},
                        </p>

                        {/* Title & Description */}
                        <h1
                          style={{
                            margin: '0 0 12px 0',
                            fontSize: '22px',
                            fontWeight: 700,
                            color: '#ffffff',
                            letterSpacing: '-0.3px',
                          }}
                        >
                          Sign in to your account
                        </h1>

                        <p
                          style={{
                            margin: '0 0 28px 0',
                            fontSize: '14px',
                            lineHeight: 1.6,
                            color: '#a1a1aa',
                          }}
                        >
                          You requested a passwordless login link for your Agni
                          workspace. Click the button below to sign in instantly
                          to your dashboard and manage your Kata MicroVM sandboxes.
                        </p>

                        {/* Primary CTA Button */}
                        <table
                          role="presentation"
                          border={0}
                          cellSpacing={0}
                          cellPadding={0}
                          style={{ marginBottom: '28px', width: '100%' }}
                        >
                          <tbody>
                            <tr>
                              <td
                                align="center"
                                style={{
                                  backgroundColor: '#f97316',
                                  borderRadius: '12px',
                                }}
                              >
                                <a
                                  href={magicLink}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{
                                    display: 'block',
                                    width: '100%',
                                    boxSizing: 'border-box',
                                    padding: '14px 28px',
                                    backgroundColor: '#f97316',
                                    background:
                                      'linear-gradient(135deg, #f97316 0%, #d97706 100%)',
                                    color: '#ffffff',
                                    textDecoration: 'none',
                                    fontWeight: 700,
                                    fontSize: '15px',
                                    borderRadius: '12px',
                                    textAlign: 'center',
                                    letterSpacing: '0.2px',
                                  }}
                                >
                                  Sign In to Agni Workspace →
                                </a>
                              </td>
                            </tr>
                          </tbody>
                        </table>

                        {/* Security Expiration Box */}
                        <table
                          role="presentation"
                          border={0}
                          cellSpacing={0}
                          cellPadding={0}
                          style={{
                            width: '100%',
                            backgroundColor: '#1a1a1e',
                            border: '1px solid #27272a',
                            borderRadius: '12px',
                            marginBottom: '24px',
                          }}
                        >
                          <tbody>
                            <tr>
                              <td style={{ padding: '14px 16px' }}>
                                <p
                                  style={{
                                    margin: 0,
                                    fontSize: '12px',
                                    lineHeight: 1.5,
                                    color: '#a1a1aa',
                                  }}
                                >
                                  <strong style={{ color: '#f59e0b' }}>
                                    ⏱️ Security Notice:
                                  </strong>{' '}
                                  This magic link will expire in{' '}
                                  <strong style={{ color: '#f4f4f5' }}>
                                    24 hours
                                  </strong>
                                  . If you didn't request this email, you can safely
                                  ignore it.
                                </p>
                              </td>
                            </tr>
                          </tbody>
                        </table>

                        {/* Monospace Copy Link Fallback */}
                        <div
                          style={{
                            borderTop: '1px solid #27272a',
                            paddingTop: '20px',
                          }}
                        >
                          <p
                            style={{
                              margin: '0 0 8px 0',
                              fontSize: '12px',
                              fontWeight: 500,
                              color: '#71717a',
                            }}
                          >
                            Button not working? Copy and paste this URL into your
                            browser:
                          </p>
                          <div
                            style={{
                              padding: '10px 12px',
                              backgroundColor: '#09090b',
                              border: '1px solid #27272a',
                              borderRadius: '8px',
                              fontFamily:
                                'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                              fontSize: '11px',
                              color: '#f97316',
                              wordBreak: 'break-all',
                              lineHeight: 1.4,
                            }}
                          >
                            {magicLink}
                          </div>
                        </div>
                      </td>
                    </tr>

                    {/* Inner Card Footer */}
                    <tr>
                      <td
                        style={{
                          padding: '20px 32px',
                          backgroundColor: '#0d0d0f',
                          borderTop: '1px solid #27272a',
                          textAlign: 'center',
                        }}
                      >
                        <p
                          style={{
                            margin: 0,
                            fontSize: '12px',
                            color: '#71717a',
                          }}
                        >
                          Agni Engine • Kata MicroVM Isolation & Orchestration
                        </p>
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Outer Footer */}
                <table
                  role="presentation"
                  width="100%"
                  border={0}
                  cellSpacing={0}
                  cellPadding={0}
                  style={{ maxWidth: '520px', marginTop: '20px' }}
                >
                  <tbody>
                    <tr>
                      <td
                        align="center"
                        style={{ fontSize: '11px', color: '#52525b' }}
                      >
                        &copy; 2026 Agni Cloud Platform. Built for autonomous AI
                        agents & microVMs.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>
  );
}

export default MagicLinkEmail;
