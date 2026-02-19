# TRC20 Approve Incident (Reported)

## Summary
User reported that after attempting TRC20 approve, wallet balance decreased.
Tronscan shows the approve transaction failed with OUT OF ENERGY.
This indicates the transaction was recorded and fees were spent, but the approve did not complete.

## Evidence (from user)
- TxID: fce8e7fa9f252b97243f1616007b49fd81a5707b11e23a34bac9db7825412bfd
- Status: CONFIRMED
- Result: FAILED - OUT OF ENERGY
- Action: approve(address,uint256)
- Contract: TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t (USDT)
- Spender: TLMpL3QMH7AoCRQ9KmsKbWpp5P5VdJguL3
- Amount: 1 USDT (1000000)

## Notes
- Approve failure due to energy still consumes fees.
- No token transfer is expected when approve fails.
- This is a reported incident record for review.
