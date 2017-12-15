/*
  Small library to facilitate simpler handling of asynchronous (promise based) actions in redux
  Usage:
    - wrapping an action constant in asynch(CONSTANT) adds .loading and .failure attributes, which can be matched on in a reducer
    - add the `middleware` (below) to the redux store to handle asynch(..) actions
*/

const SUCCESS = 'success'
const FAILURE = 'failure'
const LOADING = 'loading'


const asyncString = (s) => {
  const result = new String(s)
  result.async = true
  return result
}

export const asynch = (t) => {

  /* eslint no-new-wrappers: 0 */
  const result = new String(t)
  /* - this ought to be very isolated. We are using the string wrapper here to facilitate appending metadata to this action */
  /* - while action types don't need to be strings, they play nicer with third party tools if they behave like strings */

  result.async = true;
  result.success = t
  result.loading = asyncString(`${t}:${LOADING}`)
  result.failure = asyncString(`${t}:${FAILURE}`)

  return result
}

export const loading = (t) => {
  if (!t.loading) console.warn('Asynch: loading() used on non-asynch action ' + t)
  return t.loading || asyncString(`${t}:${LOADING}`)
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
  if (action.promise && !action.type.async){
    console.warn(`${action.type} action has promise, but is not an async action. Consider adding asynch(..) to definition`)
    return next(action)
  }
  if (!action.type.async) {
    return next(action)
  }

  function makeAction(readyState, data) {
    let type = readyState === SUCCESS ? action.type : action.type[readyState]
    let ready = readyState !== LOADING
    let newAction = Object.assign({}, action, { ready, type }, data, )
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

