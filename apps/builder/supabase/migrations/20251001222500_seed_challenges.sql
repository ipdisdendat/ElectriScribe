-- Seed a few example challenges (electrical)
-- Requires graphs table to exist

insert into graphs (name, kind, metadata)
values
 ('Challenge: Two Lights on 20A', 'challenge', '{"description":"Wire two lights to a 20A breaker without overload"}'::jsonb),
 ('Challenge: Motor Start', 'challenge', '{"description":"Add motor and ensure starting current considered"}'::jsonb),
 ('Challenge: Kitchen Loads', 'challenge', '{"description":"Kitchen outlets and appliance within limits"}'::jsonb);

-- Note: Nodes/edges should be added via app or follow-up seeds with known graph IDs

