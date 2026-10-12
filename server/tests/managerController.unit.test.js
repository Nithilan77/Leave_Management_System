jest.mock('../services/leaveService');
const leaveService = require('../services/leaveService');
const managerController = require('../controllers/managerController');

// These controllers are wrapped in asyncHandler:
//   (req, res, next) => Promise.resolve(fn(req,res,next)).catch(next)
// That always RESOLVES, even on error — on error it calls next(err) instead
// of rejecting. So: await the call, then check res.* or the captured next
// argument, rather than expecting the call itself to throw.
const makeRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('managerController.rejectRequest', () => {
  test('rejects with 400 and never calls the service when comment is missing', async () => {
    const req = { user: { _id: 'mgr1', role: 'manager' }, params: { id: 'req1' }, body: {} };
    const res = makeRes();
    const next = jest.fn();

    await managerController.rejectRequest(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0].message).toMatch(/A comment is required/);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(leaveService.rejectLeaveRequest).not.toHaveBeenCalled();
  });

  test('rejects with 400 when comment is only whitespace', async () => {
    const req = { user: { _id: 'mgr1', role: 'manager' }, params: { id: 'req1' }, body: { comment: '   ' } };
    const res = makeRes();
    const next = jest.fn();

    await managerController.rejectRequest(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(leaveService.rejectLeaveRequest).not.toHaveBeenCalled();
  });

  test('calls the service and returns 200 when a real comment is given', async () => {
    const req = {
      user: { _id: 'mgr1', role: 'manager' },
      params: { id: 'req1' },
      body: { comment: 'not approved' },
    };
    const res = makeRes();
    const next = jest.fn();
    leaveService.rejectLeaveRequest.mockResolvedValue({ _id: 'req1', status: 'REJECTED' });

    await managerController.rejectRequest(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(leaveService.rejectLeaveRequest).toHaveBeenCalledWith(req.user, 'req1', 'not approved');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, request: { _id: 'req1', status: 'REJECTED' } });
  });
});

describe('managerController.approveRequest', () => {
  test("applies the service error's statusCode onto the response, then forwards the error to next", async () => {
    const req = { user: { _id: 'mgr1', role: 'manager' }, params: { id: 'req1' }, body: {} };
    const res = makeRes();
    const next = jest.fn();
    const err = new Error('You can only approve requests from your own team');
    err.statusCode = 403;
    leaveService.approveLeaveRequest.mockRejectedValue(err);

    await managerController.approveRequest(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).toHaveBeenCalledWith(err);
  });

  test('on success, calls the service with req.user (not just the id) and returns 200', async () => {
    const req = { user: { _id: 'mgr1', role: 'manager' }, params: { id: 'req1' }, body: { comment: 'ok' } };
    const res = makeRes();
    const next = jest.fn();
    leaveService.approveLeaveRequest.mockResolvedValue({ _id: 'req1', status: 'APPROVED' });

    await managerController.approveRequest(req, res, next);

    expect(leaveService.approveLeaveRequest).toHaveBeenCalledWith(req.user, 'req1', 'ok');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(next).not.toHaveBeenCalled();
  });
});