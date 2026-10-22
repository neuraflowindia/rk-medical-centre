"""Read-only original-HTML acceptance. No private API, browser or form submission.
Usage: python read-hosted-public-pages.py EXPECTATIONS.json RECEIPT.json
Expectation: origin, pages:[{path,title,description}], utilities:[paths], redirects:[hosts].
"""
from concurrent.futures import ThreadPoolExecutor
from html.parser import HTMLParser
from pathlib import Path
import datetime,json,sys,urllib.request,urllib.error,urllib.parse,xml.etree.ElementTree as ET
class Page(HTMLParser):
 def __init__(self):
  super().__init__(convert_charrefs=True);self.tags=[];self.meta=[];self.links=[];self.title=[];self.h1=[];self.main=[];self.jsonld=[];self.stack=[];self.script=None
 def handle_starttag(self,tag,attrs):
  a=dict(attrs);self.tags.append(tag);self.stack.append(tag) if tag not in ('meta','link','img','input','br','hr','source','area','base','wbr') else None
  if tag=='meta':self.meta.append(a)
  if tag=='link':self.links.append(a)
  if tag=='script' and a.get('type')=='application/ld+json':self.script=[]
 def handle_endtag(self,tag):
  if tag=='script' and self.script is not None:self.jsonld.append(json.loads(''.join(self.script)));self.script=None
  if tag in self.stack:self.stack=self.stack[:len(self.stack)-1-self.stack[::-1].index(tag)]
 def handle_data(self,data):
  if self.script is not None:self.script.append(data)
  if 'script' in self.stack or 'style' in self.stack:return
  if 'title' in self.stack:self.title.append(data)
  if 'h1' in self.stack:self.h1.append(data)
  if 'main' in self.stack:self.main.append(data)
 def named(self,name):return [x.get('content','') for x in self.meta if x.get('name','').lower()==name]
class NoRedirect(urllib.request.HTTPRedirectHandler):
 def redirect_request(self,*args,**kwargs):return None
opener=urllib.request.build_opener(NoRedirect)
def fetch(url):
 try:r=opener.open(urllib.request.Request(url,headers={'User-Agent':'NeuraFlow-Approved-Public-Readback/1.0'}),timeout=25)
 except urllib.error.HTTPError as e:r=e
 with r:return r.status,dict(r.headers),r.read(4000001)
def header(headers,name):return next((v for k,v in headers.items() if k.lower()==name.lower()),'')
def inspect(item):
 path=item['path'];status,headers,body=fetch(origin+path);p=Page();p.feed(body.decode('utf-8'))
 title=''.join(p.title);description=p.named('description');canonical=[x.get('href') for x in p.links if x.get('rel')=='canonical'];robots=p.named('robots')+[header(headers,'x-robots-tag')]
 expected=origin+('' if path=='/' else path)
 row={'path':path,'status':status,'bytes':len(body),'title':title,'description':description,'canonical':canonical,'robots':robots,'main_characters':len(' '.join(p.main).strip()),'h1_count':p.tags.count('h1'),'main_count':p.tags.count('main'),'jsonld_blocks':len(p.jsonld),'failures':[]}
 def require(ok,message):
  if not ok:row['failures'].append(message)
 require(status==200,'public status');require(title==item['title'],'exact title');require(description==[item['description']],'exact single description');require(canonical in ([expected],[expected+'/'] if path=='/' else [expected]),'exact single canonical');require(not any('noindex' in x.lower() for x in robots),'unexpected noindex');require(row['h1_count']==1,'one H1');require(row['main_count']==1,'one main');require(row['main_characters']>=160,'meaningful original public HTML');require(len(p.jsonld)>=1,'structured public identity')
 return row
if __name__=='__main__':
 spec=json.loads(Path(sys.argv[1]).read_text());origin=spec['origin'].rstrip('/');result={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'origin':origin,'read_only':True,'scope':'Original hosted HTML and headers only; browser interaction, account indexing and provider delivery are separate.'}
 with ThreadPoolExecutor(max_workers=3) as pool:result['pages']=list(pool.map(inspect,spec['pages']))
 status,headers,body=fetch(origin+'/sitemap.xml');locs=[x.text for x in ET.fromstring(body).iter() if x.tag.rsplit('}',1)[-1]=='loc'];expected={origin+('' if p['path']=='/' else p['path']) for p in spec['pages']};actual={x.rstrip('/') for x in locs};result['sitemap']={'status':status,'count':len(locs),'unique':len(set(locs)),'matches_public_pages':actual==expected,'urls':locs}
 status,headers,body=fetch(origin+'/robots.txt');robots=body.decode('utf8');result['robots']={'status':status,'content_type':header(headers,'content-type'),'sitemap_present':origin+'/sitemap.xml' in robots,'body':robots}
 result['utilities']=[]
 for path in spec.get('utilities',[]):
  status,headers,body=fetch(origin+path);p=Page();p.feed(body.decode('utf8'));rules=p.named('robots')+[header(headers,'x-robots-tag')];result['utilities'].append({'path':path,'status':status,'robots':rules,'noindex':any('noindex' in x.lower() for x in rules)})
 result['redirects']=[]
 for host in spec.get('redirects',[]):
  suffix='/traditional-gifting?source=approved-public-review';url='https://'+host+suffix;chain=[];seen=set();valid=True
  for _ in range(3):
   if url in seen:valid=False;break
   seen.add(url);status,headers,body=fetch(url);target=header(headers,'location');chain.append({'url':url,'status':status,'location':target})
   if url==origin+suffix:valid=valid and status==200;break
   parsed=urllib.parse.urlsplit(target)
   if status not in (301,308) or parsed.scheme!='https' or parsed.netloc not in [urllib.parse.urlsplit(origin).netloc,*spec.get('redirects',[])] or parsed.path+('?' + parsed.query if parsed.query else '')!=suffix:valid=False;break
   url=target
  else:valid=False
  result['redirects'].append({'host':host,'chain':chain,'preserves_path_query':valid and chain[-1]['url']==origin+suffix and chain[-1]['status']==200})
 result['passed']=not any(x['failures'] for x in result['pages']) and result['sitemap']['status']==200 and result['sitemap']['matches_public_pages'] and result['robots']['status']==200 and result['robots']['sitemap_present'] and all(x['noindex'] for x in result['utilities']) and all(x['preserves_path_query'] for x in result['redirects'])
 Path(sys.argv[2]).write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({'passed':result['passed'],'pages':len(result['pages']),'sitemap':result['sitemap']['count'],'utilities':len(result['utilities']),'redirects':len(result['redirects']),'failures':[{'path':x['path'],'failures':x['failures']} for x in result['pages'] if x['failures']]}));sys.exit(0 if result['passed'] else 1)
