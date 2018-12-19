pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";

/**
* @title KarmaStore
* @dev An MVP implementation of the Karma Store
*/
contract KarmaStore is Ownable{
  using SafeMath for uint256;

  /*
  ██╗   ██╗ █████╗ ██████╗ ██╗ █████╗ ██████╗ ██╗     ███████╗███████╗
  ██║   ██║██╔══██╗██╔══██╗██║██╔══██╗██╔══██╗██║     ██╔════╝██╔════╝
  ██║   ██║███████║██████╔╝██║███████║██████╔╝██║     █████╗  ███████╗
  ██║   ██║██╔══██║██╔══██╗██║██╔══██║██╔══██╗██║     ██╔══╝  ╚════██║
   ╚████╔╝ ██║  ██║██║  ██║██║██║  ██║██████╔╝███████╗███████╗███████║
    ╚═══╝  ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝╚═╝  ╚═╝╚═════╝ ╚══════╝╚══════╝╚══════╝
  */
  // Mapping of Karma earnings per type of action
  mapping (bytes32 => uint256) public rewardByAction;
  // Mapping of all-time Karma by user
  mapping (address => uint256) public karmaByUser;
  // Mapping of incremental Karma since last iteration by user
  mapping (address => uint256) public incrementalKarmaByUser;
  // Total karma created since last iteration
  uint256 public totalIncrementalKarma;
  // List of users that received karma since last iteration
  address[] public incrementedUsers;

  /*
  ███████╗██╗   ██╗███████╗███╗   ██╗████████╗███████╗
  ██╔════╝██║   ██║██╔════╝████╗  ██║╚══██╔══╝██╔════╝
  █████╗  ██║   ██║█████╗  ██╔██╗ ██║   ██║   ███████╗
  ██╔══╝  ██║   ██║██╔══╝  ██║╚██╗██║   ██║   ╚════██║
  ███████╗ ╚████╔╝ ███████╗██║ ╚████║   ██║   ███████║
  ╚══════╝  ╚═══╝  ╚══════╝╚═╝  ╚═══╝   ╚═╝   ╚══════╝
  */
  event UserRewarded(address by, address user, bytes32 action, bytes32 modelId, uint256 karma);
  event RewardSet(address by, bytes32 action, uint256 karma);
  event RewardUpdated(address by, bytes32 action, uint256 oldKarma, uint256 newKarma);
  event KarmaFlushed(address by, uint256 usersCount);

  /*
   ██████╗ ███████╗████████╗████████╗███████╗██████╗ ███████╗
  ██╔════╝ ██╔════╝╚══██╔══╝╚══██╔══╝██╔════╝██╔══██╗██╔════╝
  ██║ ████╗█████╗     ██║      ██║   █████╗  ██████╔╝███████╗
  ██║   ██║██╔══╝     ██║      ██║   ██╔══╝  ██╔══██╗╚════██║
  ╚██████╔╝███████╗   ██║      ██║   ███████╗██║  ██║███████║
   ╚═════╝ ╚══════╝   ╚═╝      ╚═╝   ╚══════╝╚═╝  ╚═╝╚══════╝
  */
  function getReward(bytes32 _action) public view returns(uint256 _karma) {
    _karma = rewardByAction[_action];
  }

  function getKarma(address _user) public view returns(uint256 _karma) {
    _karma = karmaByUser[_user];
  }

  function getIncrementalKarma(address _user) public view returns(uint256 _karma) {
    _karma = incrementalKarmaByUser[_user];
  }

  function getIncrementedUsersAt(uint256 _index) public view returns(address _user) {
    _user = incrementedUsers[_index];
  }

  function getIncrementedUsersCount() public view returns(uint256 _count) {
    _count = incrementedUsers.length;
  }

  /*
  ██╗   ██╗███████╗███████╗██████╗ ███████╗
  ██║   ██║██╔════╝██╔════╝██╔══██╗██╔════╝
  ██║   ██║███████╗█████╗  ██████╔╝███████╗
  ██║   ██║╚════██║██╔══╝  ██╔══██╗╚════██║
  ╚██████╔╝███████║███████╗██║  ██║███████║
   ╚═════╝ ╚══════╝╚══════╝╚═╝  ╚═╝╚══════╝
  */
  function reward(address _user, bytes32 _action, bytes32 _modelId) public {
    uint256 karma = rewardByAction[_action];
    // Flag the user as having been incremented during this iteration
    if (incrementalKarmaByUser[_user] == 0){
      incrementedUsers.push(_user);
    }
    incrementalKarmaByUser[_user] = incrementalKarmaByUser[_user].add(karma);
    totalIncrementalKarma = totalIncrementalKarma.add(karma);
    emit UserRewarded(msg.sender, _user, _action, _modelId, karma);
  }

  /*
   █████╗ ██████╗ ███╗   ███╗██╗███╗   ██╗
  ██╔══██╗██╔══██╗████╗ ████║██║████╗  ██║
  ███████║██║  ██║██╔████╔██║██║██╔██╗ ██║
  ██╔══██║██║  ██║██║╚██╔╝██║██║██║╚██╗██║
  ██║  ██║██████╔╝██║ ╚═╝ ██║██║██║ ╚████║
  ╚═╝  ╚═╝╚═════╝ ╚═╝     ╚═╝╚═╝╚═╝  ╚═══╝
  */
  function setReward(bytes32 _action, uint256 _karma) public onlyOwner {
    // Prevent the overriding of an existing action
    require(rewardByAction[_action] == 0, "cannot set existing reward, use update instead");
    rewardByAction[_action] = _karma;
    emit RewardSet(msg.sender, _action, _karma);
  }

  function updateReward(bytes32 _action, uint256 _newKarma) public onlyOwner {
    // Ensure the action already exists, to prevent a new action being created
    // if the spelling of the action to update is not correct.
    uint256 oldKarma = rewardByAction[_action];
    require(oldKarma > 0, "action does not exist");
    rewardByAction[_action] = _newKarma;
    emit RewardUpdated(msg.sender, _action, oldKarma,  _newKarma);
  }

  function flush() public onlyOwner {
    uint256 usersCount = incrementedUsers.length;
    // For each user that has been incremented in the last iteration
    for (uint i = 0; i<usersCount; i++) {
      // Retrieve the user address
      address user = incrementedUsers[i];
      // Increment the all-time user karma with the karma recently earned
      karmaByUser[user] = karmaByUser[user].add(incrementalKarmaByUser[user]);
      // Reset the user's incremental karma
      incrementalKarmaByUser[user] = 0;
    }
    // Empty the incremented users array (reset it to its initial empty value)
    delete incrementedUsers;
    // Reset the karma count
    totalIncrementalKarma = 0;
    // Broadcast successful flushing to the world
    emit KarmaFlushed(msg.sender, usersCount);
  }
}
