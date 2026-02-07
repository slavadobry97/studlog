
import { schedule } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

// Configure your cron schedule here:
// '0 * * * *' runs every hour on the hour
const SCHEDULE = '0 * * * *';

const handler = schedule(SCHEDULE, async (event) => {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error("Missing Supabase environment variables in Keep-Alive function.");
        return {
            statusCode: 500,
        };
    }

    try {
        const supabase = createClient(supabaseUrl, supabaseKey);

        console.log("Keep-Alive: Pinging database...");

        // Perform a lightweight query
        const { data, error } = await supabase
            .from('profiles')
            .select('id')
            .limit(1)
            .single();

        if (error && error.code !== 'PGRST116') { // Ignore 'no rows' error (PGRST116)
            console.error("Keep-Alive: Error pinging database:", error);
            throw error;
        }

        console.log("Keep-Alive: Database ping successful.");

        return {
            statusCode: 200,
        };
    } catch (error) {
        console.error("Keep-Alive: Critical error:", error);
        return {
            statusCode: 500,
        };
    }
});

export { handler };
