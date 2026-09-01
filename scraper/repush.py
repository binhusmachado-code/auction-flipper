import json, sys
sys.path.insert(0, '.')
from run_all_scrapers import push_to_supabase
props = json.load(open('real_properties_backup.json'))
print(f'Loaded {len(props)} from backup', flush=True)
push_to_supabase(props, batch_size=50)
print('REPUSH DONE', flush=True)
