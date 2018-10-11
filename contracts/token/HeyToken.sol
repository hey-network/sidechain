pragma solidity ^0.4.24;

import "./ERC20/StandardBurnableToken.sol";
import "./ERC20/MintableToken.sol";

/**
 * @title HeyToken
 * @dev An out-of-the-box mintable and burnable ERC20 token
 */
contract HeyToken is StandardBurnableToken, MintableToken {
  string public name = "HeyToken";
  string public symbol = "HEY";
  uint8 public decimals = 18;
}
