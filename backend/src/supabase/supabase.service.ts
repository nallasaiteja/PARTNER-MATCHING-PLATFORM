import { Injectable, Logger } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private readonly logger = new Logger(SupabaseService.name);
  private client: SupabaseClient | null = null;
  private readonly supabaseUrl: string;
  private readonly supabaseSecretKey: string;

  constructor() {
    this.supabaseUrl =
      process.env.SUPABASE_URL ||
      'https://wykhtxwvstgbroztrlgm.supabase.co';
    this.supabaseSecretKey =
      process.env.SUPABASE_SECRET_KEY ||
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      '';

    if (this.supabaseUrl && this.supabaseSecretKey) {
      try {
        this.client = createClient(this.supabaseUrl, this.supabaseSecretKey, {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        });
        this.logger.log(`Initialized Supabase Admin Client for ${this.supabaseUrl}`);
      } catch (err: any) {
        this.logger.error(`Failed to initialize Supabase client: ${err.message}`);
      }
    } else {
      this.logger.warn(
        `Supabase credentials not fully configured (SUPABASE_URL: ${this.supabaseUrl ? 'OK' : 'MISSING'}, SUPABASE_SECRET_KEY: ${this.supabaseSecretKey ? 'OK' : 'MISSING'}). Auth fallback mode active. Configure SUPABASE_SECRET_KEY in .env to activate direct Supabase Auth API calls.`,
      );
    }
  }

  isConfigured(): boolean {
    return !!this.client;
  }

  getClient(): SupabaseClient | null {
    return this.client;
  }

  /**
   * Register a user into Supabase Auth via Admin API
   */
  async registerAuthUser(params: {
    email: string;
    password?: string;
    phone?: string;
    role: string;
    metadata?: Record<string, any>;
  }): Promise<{ user: any; error: any }> {
    if (!this.client) {
      this.logger.warn(`Supabase not configured, cannot call admin.createUser`);
      return { user: null, error: new Error('Supabase admin client not configured') };
    }

    try {
      const { data, error } = await this.client.auth.admin.createUser({
        email: params.email,
        password: params.password,
        phone: params.phone,
        email_confirm: true,
        phone_confirm: true,
        user_metadata: {
          role: params.role,
          ...(params.metadata || {}),
        },
      });

      if (error) {
        return { user: null, error };
      }

      return { user: data.user, error: null };
    } catch (err: any) {
      return { user: null, error: err };
    }
  }

  /**
   * Sign in with email and password via Supabase Auth
   */
  async signInWithPassword(params: {
    email: string;
    password: string;
  }): Promise<{ session: any; user: any; error: any }> {
    if (!this.client) {
      return { session: null, user: null, error: new Error('Supabase client not configured') };
    }

    try {
      const { data, error } = await this.client.auth.signInWithPassword({
        email: params.email,
        password: params.password,
      });

      if (error) {
        return { session: null, user: null, error };
      }

      return { session: data.session, user: data.user, error: null };
    } catch (err: any) {
      return { session: null, user: null, error: err };
    }
  }

  /**
   * Send OTP via Supabase Auth (email or phone)
   */
  async signInWithOtp(params: {
    email?: string;
    phone?: string;
  }): Promise<{ data: any; error: any }> {
    if (!this.client) {
      return { data: null, error: new Error('Supabase client not configured') };
    }

    try {
      const options: any = {};
      if (params.email) options.email = params.email;
      if (params.phone) options.phone = params.phone;

      const { data, error } = await this.client.auth.signInWithOtp(options);
      return { data, error };
    } catch (err: any) {
      return { data: null, error: err };
    }
  }

  /**
   * Verify OTP via Supabase Auth
   */
  async verifyOtp(params: {
    email?: string;
    phone?: string;
    token: string;
    type: 'sms' | 'email' | 'signup' | 'magiclink';
  }): Promise<{ session: any; user: any; error: any }> {
    if (!this.client) {
      return { session: null, user: null, error: new Error('Supabase client not configured') };
    }

    try {
      const payload: any = {
        token: params.token,
        type: params.type,
      };
      if (params.email) payload.email = params.email;
      if (params.phone) payload.phone = params.phone;

      const { data, error } = await this.client.auth.verifyOtp(payload);
      if (error) {
        return { session: null, user: null, error };
      }
      return { session: data.session, user: data.user, error: null };
    } catch (err: any) {
      return { session: null, user: null, error: err };
    }
  }

  /**
   * Verify an existing access token with Supabase Auth
   */
  async getUser(accessToken: string): Promise<{ user: any; error: any }> {
    if (!this.client) {
      return { user: null, error: new Error('Supabase client not configured') };
    }

    try {
      const { data, error } = await this.client.auth.getUser(accessToken);
      if (error) {
        return { user: null, error };
      }
      return { user: data.user, error: null };
    } catch (err: any) {
      return { user: null, error: err };
    }
  }

  /**
   * Request password reset for email via Supabase Auth
   */
  async resetPasswordForEmail(email: string): Promise<{ data: any; error: any }> {
    if (!this.client) {
      return { data: null, error: new Error('Supabase client not configured') };
    }

    try {
      const { data, error } = await this.client.auth.resetPasswordForEmail(email);
      return { data, error };
    } catch (err: any) {
      return { data: null, error: err };
    }
  }
}
