"""Exercise the unchanged receiving entry without accounts, network or stored credentials."""
from pathlib import Path
from types import ModuleType
from unittest.mock import patch
import json,os,runpy,sys

root=Path(os.environ['CLINIC_SOURCE_ROOT']).absolute();entry=root/'api/index.py'
runtime=ModuleType('appointment_system.runtime');calls=[];sentinel=object()
def create_application(profile,environment):
    calls.append((profile,environment));return sentinel
runtime.create_application=create_application
with patch.dict(sys.modules,{'appointment_system.runtime':runtime}),patch.dict(os.environ,{'CLINIC_SYNTHETIC_ENV':'true'},clear=True):
    result=runpy.run_path(str(entry))
    assert result['app'] is sentinel
    assert calls==[(root/'appointment-settings/project.json',{'CLINIC_SYNTHETIC_ENV':'true'})]
    with patch.object(Path,'is_symlink',lambda self:self==entry):
        try:runpy.run_path(str(entry))
        except RuntimeError as exc:assert str(exc)=='Project entry point links are forbidden.'
        else:raise AssertionError('An unsafe receiving entry was accepted')
assert len(calls)==1
print(json.dumps({'passed':True,'working_python_owners':1,'scenarios':2,'provider_calls':0,'secret_values_read':False}))
