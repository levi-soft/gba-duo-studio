import { json } from '@sveltejs/kit';
import { DEFAULT_CSS } from '../../../lib/preview/css.js';

export function GET() { return json({css:DEFAULT_CSS,source:'studio-preview'}); }
