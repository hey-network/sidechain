const assertRevert = require('./helpers/assertRevert')

const KarmaStore = artifacts.require('./KarmaStore.sol')

contract('KarmaStore', function([owner, alice, bob, cindy]) {
  let karmaStore

  const LIKE = 'receive_like'
  const FOLLOWER = 'receive_follower'
  const INVITE = 'invite_user'

  const LIKE_KARMA = 1
  const FOLLOWER_KARMA = 5
  const INVITE_KARMA = 3

  const MODEL_ID = 'ab2HG376sddgBF'

  beforeEach('setup contract for each test', async function() {
    karmaStore = await KarmaStore.new({ from: owner })

    await karmaStore.setReward(LIKE, LIKE_KARMA, { from: owner })
    await karmaStore.setReward(FOLLOWER, FOLLOWER_KARMA, { from: owner })
    await karmaStore.setReward(INVITE, INVITE_KARMA, { from: owner })
  })

  it('allows the owner to create and update actions with their karma rewards', async function() {
    assert.equal(await karmaStore.getReward(LIKE), LIKE_KARMA)
    assert.equal(await karmaStore.getReward(FOLLOWER), FOLLOWER_KARMA)
    assert.equal(await karmaStore.getReward(INVITE), INVITE_KARMA)

    await karmaStore.updateReward(LIKE, LIKE_KARMA + 1, { from: owner })

    assert.equal(await karmaStore.getReward(LIKE), LIKE_KARMA + 1)
  })

  it('allows only the owner to create actions', async function() {
    await assertRevert(karmaStore.setReward(LIKE, LIKE_KARMA, { from: alice }))
  })

  it('allows only the owner to update actions', async function() {
    await assertRevert(karmaStore.updateReward(LIKE, LIKE_KARMA + 1, { from: alice }))
  })

  it('allows only the owner to trigger karma flush', async function() {
    await assertRevert(karmaStore.flush({ from: alice }))
  })

  it('does not allow to create the same action twice', async function() {
    await assertRevert(karmaStore.setReward(LIKE, LIKE_KARMA, { from: owner }))
  })

  it('does not allow to update an action that does not exist', async function() {
    await assertRevert(karmaStore.updateReward('dummy_action', 1, { from: owner }))
  })

  it('rounds down rewards for actions with a non-integer reward value', async function() {
    await karmaStore.updateReward(LIKE, 7.9, { from: owner })
    assert.equal(await karmaStore.getReward(LIKE), 7)
  })

  it('does not put a cap on the reward value for actions', async function() {
    await karmaStore.updateReward(LIKE, 1e10, { from: owner })
    assert.equal(await karmaStore.getReward(LIKE), 1e10)
  })

  it('happy path - allows a user to trigger rewarding of another user for an action, then allows the owner to flush the karma generated', async function () {
    assert.equal(await getKarma(alice), 0)
    assert.equal(await getKarma(bob), 0)
    assert.equal(await getKarma(cindy), 0)
    assert.equal(await getIncrementedUsersCount(), 0)
    assert.equal(await getIncrementalKarma(alice), 0)
    assert.equal(await getIncrementalKarma(bob), 0)
    assert.equal(await getIncrementalKarma(cindy), 0)
    assert.equal(await getTotalIncrementalKarma(), 0)

    await karmaStore.reward(alice, LIKE, MODEL_ID, { from: bob })

    assert.equal(await getKarma(alice), 0)
    assert.equal(await getKarma(bob), 0)
    assert.equal(await getKarma(cindy), 0)
    assert.equal(await getIncrementedUsersCount(), 1)
    assert.equal(await getIncrementalKarma(alice), LIKE_KARMA)
    assert.equal(await getIncrementalKarma(bob), 0)
    assert.equal(await getIncrementalKarma(cindy), 0)
    assert.equal(await getTotalIncrementalKarma(), LIKE_KARMA)

    await karmaStore.reward(alice, FOLLOWER, MODEL_ID, { from: cindy })

    assert.equal(await getKarma(alice), 0)
    assert.equal(await getKarma(bob), 0)
    assert.equal(await getKarma(cindy), 0)
    assert.equal(await getIncrementedUsersCount(), 1)
    assert.equal(await getIncrementalKarma(alice), LIKE_KARMA + FOLLOWER_KARMA)
    assert.equal(await getIncrementalKarma(bob), 0)
    assert.equal(await getIncrementalKarma(cindy), 0)
    assert.equal(await getTotalIncrementalKarma(), LIKE_KARMA + FOLLOWER_KARMA)

    await karmaStore.reward(bob, INVITE, MODEL_ID, { from: alice })

    assert.equal(await getKarma(alice), 0)
    assert.equal(await getKarma(bob), 0)
    assert.equal(await getKarma(cindy), 0)
    assert.equal(await getIncrementedUsersCount(), 2)
    assert.equal(await getIncrementalKarma(alice), LIKE_KARMA + FOLLOWER_KARMA)
    assert.equal(await getIncrementalKarma(bob), INVITE_KARMA)
    assert.equal(await getIncrementalKarma(cindy), 0)
    assert.equal(await getTotalIncrementalKarma(), LIKE_KARMA + FOLLOWER_KARMA + INVITE_KARMA)

    await karmaStore.flush({ from: owner })

    assert.equal(await getKarma(alice), LIKE_KARMA + FOLLOWER_KARMA)
    assert.equal(await getKarma(bob), INVITE_KARMA)
    assert.equal(await getKarma(cindy), 0)
    assert.equal(await getIncrementedUsersCount(), 0)
    assert.equal(await getIncrementalKarma(alice), 0)
    assert.equal(await getIncrementalKarma(bob), 0)
    assert.equal(await getIncrementalKarma(cindy), 0)
    assert.equal(await getTotalIncrementalKarma(), 0)

    await karmaStore.updateReward(FOLLOWER, FOLLOWER_KARMA + 1, { from: owner })

    await karmaStore.reward(cindy, FOLLOWER, MODEL_ID, { from: bob })

    assert.equal(await getKarma(alice), LIKE_KARMA + FOLLOWER_KARMA)
    assert.equal(await getKarma(bob), INVITE_KARMA)
    assert.equal(await getKarma(cindy), 0)
    assert.equal(await getIncrementedUsersCount(), 1)
    assert.equal(await getIncrementalKarma(alice), 0)
    assert.equal(await getIncrementalKarma(bob), 0)
    assert.equal(await getIncrementalKarma(cindy), FOLLOWER_KARMA + 1)
    assert.equal(await getTotalIncrementalKarma(), FOLLOWER_KARMA + 1)

    await karmaStore.flush({ from: owner })

    assert.equal(await getKarma(alice), LIKE_KARMA + FOLLOWER_KARMA)
    assert.equal(await getKarma(bob), INVITE_KARMA)
    assert.equal(await getKarma(cindy), FOLLOWER_KARMA + 1)
    assert.equal(await getIncrementedUsersCount(), 0)
    assert.equal(await getIncrementalKarma(alice), 0)
    assert.equal(await getIncrementalKarma(bob), 0)
    assert.equal(await getIncrementalKarma(cindy), 0)
    assert.equal(await getTotalIncrementalKarma(), 0)
  })

  async function getKarma (user) {
    return (await karmaStore.getKarma(user)).toNumber()
  }

  async function getIncrementalKarma (user) {
    return (await karmaStore.getIncrementalKarma(user)).toNumber()
  }

  async function getTotalIncrementalKarma (user) {
    return (await karmaStore.totalIncrementalKarma()).toNumber()
  }

  async function getIncrementedUsersCount () {
    return (await karmaStore.getIncrementedUsersCount()).toNumber()
  }
})
