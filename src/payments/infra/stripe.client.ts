import Stripe from 'stripe';
import { env } from '../../shared/env.config';

export const stripeClient = new Stripe(env.stripeSecretKey);
