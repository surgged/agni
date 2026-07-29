/// <reference types="bun-types" />
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MagicLinkEmail } from '../src/emails/MagicLinkEmail';

async function buildEmails() {
  console.log('⚡ Rendering React Email templates to static HTML via Bun...');

  const htmlContent = renderToStaticMarkup(
    React.createElement(MagicLinkEmail, {
      magicLink: '{{MAGIC_LINK}}',
      recipientEmail: '{{RECIPIENT_EMAIL}}',
    })
  );
  const fullHtml = `<!DOCTYPE html>\n${htmlContent}`;

  const targetFile = `${import.meta.dir}/../../internal/adapters/email/templates/magic_link.html`;
  await Bun.write(targetFile, fullHtml);

  console.log(`✅ Successfully compiled MagicLinkEmail.tsx -> ${targetFile}`);
}

buildEmails();

