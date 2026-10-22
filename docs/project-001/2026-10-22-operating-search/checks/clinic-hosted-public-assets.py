"""Read-only image release proof; no tokens, response bodies or customer actions.

The protected-host rows are supplied by the existing signed-in MCP, never by an
alternate login. This helper performs only ordinary official-origin HEADs and
four GET/hash comparisons against the unchanged candidate/dist source files.
"""
import concurrent.futures
import datetime
import hashlib
import json
from pathlib import Path
import re
import urllib.error
import urllib.parse
import urllib.request

EX = Path(__file__).resolve().parent.parent
CANDIDATE = EX / 'candidate'
DIST = CANDIDATE / 'dist'
OUTPUT = EX / 'clinic-hosted-public-assets.json'
ORIGIN = 'https://www.rkmedicalcentre.com'
PREFIXES = ('clinic-assets', 'client-photos', 'certificates')
SAFE_IMAGE = re.compile(r'^/(?:clinic-assets|client-photos|certificates)/(?:[a-z0-9_-]+/)*[a-z0-9_-]+\.(?:webp|png|jpg|jpeg|svg|ico)$')
TYPES = {'.webp':'image/webp', '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.svg':'image/svg+xml', '.ico':'image/x-icon'}

def sha(data):
    return hashlib.sha256(data).hexdigest()

def check_deployment(report, sources):
    for row in report['deployment_probe']['observations']:
        passed = row['tool_success'] and row['status'] == row['expected']
        if row['expected'] == 200:
            source = sources.get(row['path'])
            row['source_bytes'] = source['bytes'] if source else None
            passed = (passed and source is not None and
                      row['content_type'] == TYPES[Path(row['path']).suffix] and
                      row['content_length'] is not None and
                      int(row['content_length']) == source['bytes'])
        row['passed'] = bool(passed)
    report['deployment_probe']['passed'] = all(row['passed'] for row in report['deployment_probe']['observations'])

def read(path, method):
    request = urllib.request.Request(ORIGIN + path, method=method, headers={'Accept-Encoding':'identity', 'User-Agent':'NeuraFlow-owned-site-release-readback/1.0'})
    try:
        response = urllib.request.urlopen(request, timeout=25)
    except urllib.error.HTTPError as error:
        response = error
    with response:
        # Only the final URL's exact public origin/path is retained. Headers are
        # strictly allowlisted; redirect/login/cookie/auth material is omitted.
        final = urllib.parse.urlsplit(response.geturl())
        same_target = final.scheme + '://' + final.netloc == ORIGIN and final.path == path and not final.query
        headers = response.headers
        body = response.read() if method == 'GET' else b''
        row = {'path':path, 'method':method, 'status':response.status,
               'content_type':headers.get_content_type(), 'content_length':headers.get('Content-Length'),
               'same_public_target':same_target}
        if method == 'GET':
            row.update({'received_bytes':len(body), 'received_sha256':sha(body)})
        return row

def main():
    report = json.loads(OUTPUT.read_text())
    assert report['deployment_probe']['passed'] is True, 'Protected-host proof must already pass.'
    profile_file = DIST / 'appointment-routing-profile.json'
    manifest_file = DIST / 'appointment-surface-manifest.json'
    profile = json.loads(profile_file.read_text())
    manifest = json.loads(manifest_file.read_text())
    assert profile['origin'] == ORIGIN
    allowed = [profile['origin'], *profile['aliases']]
    assert report['deployment_host'] not in allowed, 'Host contrast would not prove guard bypass.'
    sources = {}
    counts = {}
    for prefix in PREFIXES:
        directory = DIST / prefix
        assert directory.is_dir() and not directory.is_symlink()
        counts[prefix] = 0
        for file in sorted(directory.rglob('*')):
            assert not file.is_symlink(), 'Image source links are forbidden.'
            if file.is_dir():
                continue
            path = '/' + file.relative_to(DIST).as_posix()
            assert file.is_file() and SAFE_IMAGE.fullmatch(path), 'Unsafe image path.'
            assert manifest['assets'][path] == 'general', 'Image must be a public general asset.'
            sources[path] = {'bytes':file.stat().st_size, 'sha256':sha(file.read_bytes())}
            counts[prefix] += 1
    assert len(sources) == 262, 'The approved complete image denominator changed.'
    middleware_file = CANDIDATE / 'middleware.ts'
    identity_before = {str(p.relative_to(CANDIDATE)):sha(p.read_bytes()) for p in (middleware_file, profile_file, manifest_file)}
    failures = []
    check_deployment(report, sources)
    failures.extend('Protected host ' + row['path'] for row in report['deployment_probe']['observations'] if not row['passed'])

    def head(path):
        try:
            row = read(path, 'HEAD')
            row['source_bytes'] = sources[path]['bytes']
            length = row['content_length']
            row['passed'] = (row['status'] == 200 and row['same_public_target'] and
                             row['content_type'] == TYPES[Path(path).suffix] and
                             length is not None and int(length) == row['source_bytes'])
            return row
        except Exception as error:
            return {'path':path, 'method':'HEAD', 'passed':False, 'error_type':type(error).__name__}

    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
        heads = list(pool.map(head, sorted(sources)))
    failures.extend('HEAD ' + row['path'] for row in heads if not row['passed'])
    representatives = [
        '/clinic-assets/a06-phone-320.webp',
        '/client-photos/sanjay-gupta-at-desk-160.webp',
        '/certificates/parul-gupta-certificate-01-480.webp',
        '/clinic-assets/rk-medical-centre-social.png',
    ]
    gets = []
    for path in representatives:
        try:
            row = read(path, 'GET')
            row.update({'source_bytes':sources[path]['bytes'], 'source_sha256':sources[path]['sha256']})
            row['passed'] = (row['status'] == 200 and row['same_public_target'] and
                             row['content_type'] == TYPES[Path(path).suffix] and
                             row['received_bytes'] == row['source_bytes'] and
                             row['received_sha256'] == row['source_sha256'])
        except Exception as error:
            row = {'path':path, 'method':'GET', 'passed':False, 'error_type':type(error).__name__}
        gets.append(row)
        if not row['passed']:
            failures.append('GET/hash ' + path)

    identity_after = {str(p.relative_to(CANDIDATE)):sha(p.read_bytes()) for p in (middleware_file, profile_file, manifest_file)}
    unchanged = identity_before == identity_after and all(
        (DIST / path.lstrip('/')).stat().st_size == value['bytes'] and
        sha((DIST / path.lstrip('/')).read_bytes()) == value['sha256']
        for path, value in sources.items())
    if not unchanged:
        failures.append('Candidate source changed during readback.')
    report.update({
        'completed_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),
        'origin':ORIGIN, 'source_identity':identity_before, 'source_unchanged':unchanged,
        'deployment_host_absent_from_allowed_hosts':True,
        'official_head_inventory':{'prefixes':counts, 'denominator':len(sources),
            'passed_count':sum(row['passed'] for row in heads), 'observations':heads},
        'official_representative_hashes':gets, 'failures':failures,
        'boundaries':['Official-origin HEAD proves HTTP200, exact image type and source byte length for all 262 paths; four GETs prove exact source bytes.',
            'Signed-in MCP protected-host status contrast proves matcher exclusion; CDN cache headers are not the proof.',
            'Only image paths, status/type/length and hashes are retained. No auth links, cookies, full headers, body bytes or customer data.',
            'No page/API/booking/customer mutation or provider dispatch was performed.'],
        'passed':not failures and report['deployment_probe']['passed'] and unchanged})
    report.pop('pending', None)
    OUTPUT.write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps({'passed':report['passed'], 'heads':len(heads), 'heads_passed':sum(row['passed'] for row in heads),
                      'exact_source_gets':sum(row['passed'] for row in gets), 'protected_host_cases':len(report['deployment_probe']['observations']),
                      'prefixes':counts, 'failures':failures}))
    if not report['passed']:
        raise SystemExit(1)

if __name__ == '__main__':
    main()
