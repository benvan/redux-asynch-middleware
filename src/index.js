/*
  Small library to facilitate simpler handling of asynchronous (promise based) actions in redux
  Usage:
    - wrapping an action constant in asynch(CONSTANT) adds .loading and .failure attributes, which can be matched on in a reducer
    - add the `middleware` (below) to the redux store to handle asynch(..) actions
*/

const SUCCESS = 'success'
const FAILURE = 'failure'
const LOADING = 'loading'

const AsynchSymbol = '@@asynch'

export const asynch = (t) => {

  const result = function(){}
	result.toString = () => t
  result[AsynchSymbol] = true;

  result.success = t
  result.loading = (`${t}:${LOADING}`)
  result.failure = (`${t}:${FAILURE}`)

  return result
}

export const loading = (t) => {
  if (!t.loading) console.warn('Asynch: loading() used on non-asynch action ' + t)
  return t.loading || (`${t}:${LOADING}`)
}

/**
 * Lets you dispatch special actions with a { promise } field.
 *
 * This middleware will turn them into a single action at the beginning,
 * and a single success (or failure) action when the `promise` resolves.
 *
 * For convenience, `dispatch` will return the promise so the caller can wait.
 */
export const middleware = store => next => action => {
  if (action.promise && !action.type[AsynchSymbol]){
    console.warn(`${action.type} action has promise, but is not an asynch action. Consider adding asynch(..) to definition`)
    return next(action)
  }
  if (!action.type[AsynchSymbol] && !action[AsynchSymbol]) {
    return next(action)
  }

  function makeAction(readyState, data) {
    let type = action.type[readyState]
    let ready = readyState !== LOADING
    let newAction = Object.assign({}, action, { ready, type, [AsynchSymbol]:true}, data, )

    delete newAction.promise
    return newAction
  }

  next(makeAction(LOADING))
  return action.promise.then(
    result => {
      setImmediate(() => next(makeAction(SUCCESS, { result })))
      return result
    },
    error => {
      console.error(`${action.type} action encountered error:`,error)
      setImmediate(() => next(makeAction(FAILURE, { error })))
      throw error
    }
  )
}

export default asynch

