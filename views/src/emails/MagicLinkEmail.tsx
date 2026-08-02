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
          color: '#fafafa',
        }}
      >
        <table
          role="presentation"
          width="100%"
          border={0}
          cellSpacing={0}
          cellPadding={0}
          style={{ backgroundColor: '#09090b', padding: '48px 16px' }}
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
                  style={{ maxWidth: '480px' }}
                >
                  <tbody>
                    {/* Brand Logo */}
                    <tr>
                      <td style={{ padding: '0 0 32px 0' }}>
                        <table
                          role="presentation"
                          border={0}
                          cellSpacing={0}
                          cellPadding={0}
                        >
                          <tbody>
                            <tr>
                              <td
                                style={{
                                  background:
                                    'linear-gradient(to bottom right, #f97316, #d97706, #c2410c)',
                                  borderRadius: '12px',
                                  padding: '1px',
                                  boxShadow: '0 4px 12px rgba(249, 115, 22, 0.2)',
                                }}
                              >
                                <table
                                  role="presentation"
                                  border={0}
                                  cellSpacing={0}
                                  cellPadding={0}
                                >
                                  <tbody>
                                    <tr>
                                      <td
                                        style={{
                                          background: '#09090b',
                                          borderRadius: '11px',
                                          width: '38px',
                                          height: '38px',
                                          textAlign: 'center',
                                          verticalAlign: 'middle',
                                        }}
                                      >
                                        <img
                                          src="https://sss.surgged.xyz/agni/logo.svg"
                                          alt="Agni"
                                          width="22"
                                          height="22"
                                          style={{ display: 'block', margin: '0 auto' }}
                                        />
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                              </td>
                              <td style={{ paddingLeft: '12px' }}>
                                <table
                                  role="presentation"
                                  border={0}
                                  cellSpacing={0}
                                  cellPadding={0}
                                >
                                  <tbody>
                                    <tr>
                                      <td>
                                        <span
                                          style={{
                                            fontSize: '20px',
                                            fontWeight: 800,
                                            letterSpacing: '-0.3px',
                                            color: '#fafafa',
                                            fontFamily:
                                              'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                                          }}
                                        >
                                          AGNI
                                        </span>
                                      </td>
                                      <td style={{ paddingLeft: '8px' }}>
                                        <span
                                          style={{
                                            fontSize: '10px',
                                            fontWeight: 600,
                                            color: '#f97316',
                                            fontFamily:
                                              'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                                            background: 'rgba(249, 115, 22, 0.1)',
                                            border: '1px solid rgba(249, 115, 22, 0.3)',
                                            borderRadius: '4px',
                                            padding: '2px 6px',
                                          }}
                                        >
                                          MCP
                                        </span>
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </td>
                    </tr>

                    {/* Greeting */}
                    <tr>
                      <td style={{ paddingBottom: '8px' }}>
                        <p
                          style={{
                            margin: 0,
                            fontSize: '14px',
                            fontWeight: 500,
                            color: '#a1a1aa',
                          }}
                        >
                          Hi {recipientEmail},
                        </p>
                      </td>
                    </tr>

                    {/* Title */}
                    <tr>
                      <td style={{ paddingBottom: '8px' }}>
                        <h1
                          style={{
                            margin: 0,
                            fontSize: '24px',
                            fontWeight: 700,
                            color: '#fafafa',
                            letterSpacing: '-0.4px',
                          }}
                        >
                          Sign in to your account
                        </h1>
                      </td>
                    </tr>

                    {/* Description */}
                    <tr>
                      <td style={{ paddingBottom: '32px' }}>
                        <p
                          style={{
                            margin: 0,
                            fontSize: '15px',
                            lineHeight: 1.6,
                            color: '#a1a1aa',
                          }}
                        >
                          Click the button below to sign in instantly to your
                          dashboard and manage your Kata MicroVM sandboxes.
                        </p>
                      </td>
                    </tr>

                    {/* CTA Button */}
                    <tr>
                      <td style={{ paddingBottom: '32px' }}>
                        <table
                          role="presentation"
                          border={0}
                          cellSpacing={0}
                          cellPadding={0}
                          style={{ width: '100%' }}
                        >
                          <tbody>
                            <tr>
                              <td
                                align="center"
                                style={{
                                  backgroundColor: '#f97316',
                                  borderRadius: '10px',
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
                                    padding: '14px 32px',
                                    backgroundColor: '#f97316',
                                    color: '#ffffff',
                                    textDecoration: 'none',
                                    fontWeight: 600,
                                    fontSize: '15px',
                                    borderRadius: '10px',
                                    textAlign: 'center',
                                    letterSpacing: '0.1px',
                                  }}
                                >
                                  Sign in to Agni →
                                </a>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </td>
                    </tr>

                    {/* Fallback Link */}
                    <tr>
                      <td
                        style={{
                          padding: '24px 0 0 0',
                          borderTop: '1px solid #1c1c1f',
                        }}
                      >
                        <p
                          style={{
                            margin: '0 0 10px 0',
                            fontSize: '12px',
                            fontWeight: 500,
                            color: '#52525b',
                          }}
                        >
                          Link not working? Copy and paste this URL:
                        </p>
                        <p
                          style={{
                            margin: 0,
                            fontFamily:
                              'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                            fontSize: '12px',
                            color: '#71717a',
                            wordBreak: 'break-all',
                            lineHeight: 1.5,
                          }}
                        >
                          {magicLink}
                        </p>
                      </td>
                    </tr>

                    {/* Security Notice */}
                    <tr>
                      <td style={{ paddingTop: '32px' }}>
                        <p
                          style={{
                            margin: '0 0 4px 0',
                            fontSize: '12px',
                            lineHeight: 1.5,
                            color: '#52525b',
                          }}
                        >
                          This link expires in 10 minutes and can only be used
                          once.
                        </p>
                        <p
                          style={{
                            margin: 0,
                            fontSize: '12px',
                            lineHeight: 1.5,
                            color: '#52525b',
                          }}
                        >
                          If you didn't request this, you can safely ignore this
                          email.
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
                  style={{ maxWidth: '480px', marginTop: '32px' }}
                >
                  <tbody>
                    <tr>
                      <td
                        align="center"
                        style={{ fontSize: '11px', color: '#3f3f46' }}
                      >
                        Agni Cloud Platform &middot; Kata MicroVM Orchestration
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
