"""One local readiness projection for new intake; never probes a provider.

Saved orders retain their own credentials and recovery path. An unavailable
writer must not turn an uncertain online request into an at-clinic booking.
"""
from .razorpay import RazorpayFailure
from .storage import UnavailableStore
from .webhook import WebhookAccount, WebhookRegistry


def expected_merchant(store, accounts, *, webhook=None, ingress=None, strict=False):
    if accounts is None:
        return None
    configured = store.payment_intake()
    if not isinstance(configured, dict):
        return None
    try:
        expected = {key: configured[key] for key in ('merchant_id', 'mode', 'credential_version')}
        adapter = accounts.current(expected['merchant_id'], expected['mode'])
        if adapter.credentials.version != expected['credential_version']:
            return None
        if strict:
            if configured.get('public_open') is not True or ingress is None or isinstance(ingress, UnavailableStore):
                return None
            hooks = webhook.accounts if isinstance(webhook, WebhookRegistry) else (webhook,) if isinstance(webhook, WebhookAccount) else ()
            if not any(h.merchant_id == expected['merchant_id'] and h.mode == expected['mode'] for h in hooks):
                return None
        return expected
    except (KeyError, ValueError, RazorpayFailure):
        return None


def payment_availability(policy, expected):
    """The caller has already passed supported booking admission."""
    foundation = policy.get('schedule_browsing_open') is True
    return {method: {'available': foundation and (method == 'at_clinic' or expected is not None),
                     'reason': None if foundation and (method == 'at_clinic' or expected is not None) else 'temporarily_unavailable'}
            for method in policy['policy']['payment_methods']}
