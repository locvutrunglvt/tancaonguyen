
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://whyyfnbldwesqnjkykbv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndoeXlmbmJsZHdlc3Fuamt5a2J2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4NDM4MDMsImV4cCI6MjA4NTQxOTgwM30.V2vSsAN39pN-OFwTgeGT6itPoT57jrs6bxcA1mkPlvY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectUser() {
    const email = 'hoa@gmail.com';
    console.log(`Checking profile for ${email}...`);

    // Check profiles table
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email);

    if (error) {
        console.error("Error:", error.message);
    } else {
        console.log("Profile Data:", data);
    }
}

inspectUser();
