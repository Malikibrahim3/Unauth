-- Loss attribution: rename the delivery-protected label so it no longer reads
-- as a loss ("failed_delivery_evidence" fired when the merchant HAD proof of
-- delivery — the opposite of a loss), and add the two buckets the product
-- spec calls for that had no attribution value at all: repeat_claimant
-- (identity-resolved claim frequency) and policy_override (an agent approved
-- a payout outside the merchant's own rule recommendation).
alter type loss_attribution rename value 'failed_delivery_evidence' to 'delivery_confirmed_evidence';
alter type loss_attribution add value 'repeat_claimant';
alter type loss_attribution add value 'policy_override';
