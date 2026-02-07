
import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const handler: Handler = async (event, context) => {
    // Only allow POST
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        console.error("Missing Supabase Service Role Key");
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Server configuration error: Missing Service Role Key' }),
        };
    }

    try {
        const { userId, newPassword } = JSON.parse(event.body || '{}');

        if (!userId || !newPassword) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Missing userId or newPassword' }),
            };
        }

        if (newPassword.length < 6) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Password must be at least 6 characters' }),
            };
        }

        // 1. Verify the CALLER is an Admin
        const authHeader = event.headers.authorization;
        if (!authHeader) {
            return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
        }

        const token = authHeader.replace('Bearer ', '');
        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

        // Get the caller's user object
        const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(token);

        if (authError || !caller) {
            return { statusCode: 401, body: JSON.stringify({ error: 'Invalid token' }) };
        }

        // Check caller's role in the DB
        const { data: profile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('role')
            .eq('id', caller.id)
            .single();

        if (profileError || profile?.role !== 'Администратор') {
            return { statusCode: 403, body: JSON.stringify({ error: 'Forbidden: Only Administrators can reset passwords' }) };
        }

        // 2. Perform the Password Update
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            userId,
            { password: newPassword }
        );

        if (updateError) throw updateError;

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Password updated successfully' }),
        };

    } catch (error: any) {
        console.error("Reset Password Error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message || 'Internal Server Error' }),
        };
    }
};

export { handler };
