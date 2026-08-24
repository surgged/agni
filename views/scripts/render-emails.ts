/// <reference types="bun-types" />
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MagicLinkEmail } from '../src/emails/MagicLinkEmail';
import { VerifyEmailEmail } from '../src/emails/VerifyEmailEmail';

async function buildEmails() {
  console.log('⚡ Rendering React Email templates to static HTML via Bun...');

  const templatesDir = `${import.meta.dir}/../../internal/adapters/email/templates`;

  // Magic Link Email
  const magicLinkHtml = renderToStaticMarkup(
    React.createElement(MagicLinkEmail, {
      magicLink: '{{MAGIC_LINK}}',
      recipientEmail: '{{RECIPIENT_EMAIL}}',
    })
  );
  await Bun.write(
    `${templatesDir}/magic_link.html`,
    `<!DOCTYPE html>\n${magicLinkHtml}`
  );
  console.log(`✅ MagicLinkEmail compiled -> magic_link.html`);

  // Verify Email
  const verifyEmailHtml = renderToStaticMarkup(
    React.createElement(VerifyEmailEmail, {
      verifyLink: '{{VERIFY_LINK}}',
      recipientName: '{{RECIPIENT_NAME}}',
      recipientEmail: '{{RECIPIENT_EMAIL}}',
    })
  );
  await Bun.write(
    `${templatesDir}/verify_email.html`,
    `<!DOCTYPE html>\n${verifyEmailHtml}`
  );
  console.log(`✅ VerifyEmailEmail compiled -> verify_email.html`);
}

buildEmails();
