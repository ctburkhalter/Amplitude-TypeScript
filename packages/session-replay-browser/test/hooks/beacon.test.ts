import * as AnalyticsCore from '@amplitude/analytics-core';
import { SessionReplayJoinedConfig } from 'src/config/types';
import { BeaconTransport } from '../../src/beacon-transport';
import { randomUUID } from 'crypto';

type TestEvent = {
  Field1: string;
  Field2: number;
};

describe('beacon', () => {
  const mockGlobalScope = (globalScope?: Partial<typeof globalThis>): typeof globalThis => {
    const mockedGlobalScope = jest.spyOn(AnalyticsCore, 'getGlobalScope');
    mockedGlobalScope.mockReturnValue(globalScope as typeof globalThis);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return AnalyticsCore.getGlobalScope()!;
  };

  describe('BeaconTransport', () => {
    let transport: BeaconTransport<TestEvent>;
    let deviceId: string;
    let sessionId: number;
    let apiKey: string;

    const xmlMockFns = {
      open: jest.fn(),
      send: jest.fn(),
      setRequestHeader: jest.fn(),
    };

    beforeEach(() => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      window.XMLHttpRequest = jest.fn().mockImplementation(() => {
        return xmlMockFns;
      }) as any;

      sessionId = Date.now();
      deviceId = randomUUID();
      apiKey = randomUUID();

      transport = new BeaconTransport<TestEvent>(
        {
          sessionId,
          type: 'interaction',
        },
        {
          apiKey,
        } as SessionReplayJoinedConfig,
      );
    });

    afterEach(() => {
      jest.resetAllMocks();
    });

    describe('#send', () => {
      test('sends with beacon', () => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        const mockedGlobalScope = mockGlobalScope({
          navigator: {
            sendBeacon: jest.fn().mockImplementation(() => true),
          },
          Blob: jest.fn(),
        } as any);

        transport = new BeaconTransport<TestEvent>(
          {
            sessionId,
            type: 'interaction',
          },
          {
            apiKey,
          } as SessionReplayJoinedConfig,
        );
        transport.send(deviceId, {
          Field1: 'foo',
          Field2: 1234,
        });
        expect(xmlMockFns.open).not.toHaveBeenCalled();
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(mockedGlobalScope.navigator.sendBeacon).toHaveBeenCalledWith(
          `https://api-sr.amplitude.com/sessions/v2/track?device_id=${deviceId}&session_id=${sessionId}&type=interaction&api_key=${apiKey}`,
          JSON.stringify({ Field1: 'foo', Field2: 1234 }),
        );
      });
      test('falls back to xhr', () => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        mockGlobalScope({
          navigator: {
            sendBeacon: jest.fn().mockImplementation(() => false),
          },
          Blob: jest.fn(),
        } as any);

        transport = new BeaconTransport<TestEvent>(
          {
            sessionId,
            type: 'interaction',
          },
          {
            apiKey,
          } as SessionReplayJoinedConfig,
        );
        transport.send(deviceId, {
          Field1: 'foo',
          Field2: 1234,
        });
        expect(xmlMockFns.open).toHaveBeenCalledWith(
          'POST',
          `https://api-sr.amplitude.com/sessions/v2/track?device_id=${deviceId}&session_id=${sessionId}&type=interaction&api_key=${apiKey}`,
          true,
        );
      });
      test('sends with xhr', () => {
        transport.send(deviceId, {
          Field1: 'foo',
          Field2: 1234,
        });
        expect(xmlMockFns.open).toHaveBeenCalledWith(
          'POST',
          `https://api-sr.amplitude.com/sessions/v2/track?device_id=${deviceId}&session_id=${sessionId}&type=interaction&api_key=${apiKey}`,
          true,
        );
      });
    });
  });
});
