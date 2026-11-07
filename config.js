/* Public Supabase client settings for Wick score comparison.
   The publishable key is meant to ship in the browser. It cannot read the score table. */
var SUPABASE_URL = "https://hlnlkcdmtnbzouomcxcg.supabase.co";
var SUPABASE_PUBLISHABLE_KEY = "sb_publishable_mZ2gX2NpuBIJosiz97QjOw_AU-wQe6n";

/* Count endpoint supplied for the owner's GoatCounter site.
   The script is not added by this file. analytics.js loads it only after
   an optional opt-in, and only on wickquiz.com. */
var WICK_GOATCOUNTER_ENDPOINT = "https://zachfrenchwickquiz.goatcounter.com/count";

window.SUPABASE_URL = SUPABASE_URL;
window.SUPABASE_PUBLISHABLE_KEY = SUPABASE_PUBLISHABLE_KEY;
window.WICK_GOATCOUNTER_ENDPOINT = WICK_GOATCOUNTER_ENDPOINT;
