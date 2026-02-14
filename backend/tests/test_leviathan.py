"""
Test suite for Leviathan ship class and Warp Battle backend APIs
Tests health endpoint, rooms endpoint, and game_engine Leviathan configuration
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealthEndpoint:
    """Test backend health and rooms endpoints"""
    
    def test_health_endpoint(self):
        """Test /api/ health endpoint returns correct message"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert data["message"] == "Warp Battle Server Online"
        print(f"SUCCESS: Health endpoint returned: {data}")
    
    def test_rooms_endpoint(self):
        """Test /api/rooms endpoint returns array"""
        response = requests.get(f"{BASE_URL}/api/rooms")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: Rooms endpoint returned: {data}")


class TestLeviathanConfiguration:
    """Test Leviathan ship class configuration in game_engine"""
    
    def test_leviathan_in_ship_classes(self):
        """Verify Leviathan is defined in SHIP_CLASSES"""
        import sys
        sys.path.insert(0, '/app/backend')
        from game_engine import SHIP_CLASSES
        
        assert "leviathan" in SHIP_CLASSES
        print(f"SUCCESS: Leviathan found in SHIP_CLASSES")
        
    def test_leviathan_stats(self):
        """Verify Leviathan has correct stats: Hull 180, Shields 120, Energy 120"""
        import sys
        sys.path.insert(0, '/app/backend')
        from game_engine import SHIP_CLASSES
        
        leviathan = SHIP_CLASSES["leviathan"]
        assert leviathan["max_hull"] == 180.0, f"Expected max_hull 180, got {leviathan['max_hull']}"
        assert leviathan["max_shields"] == 120.0, f"Expected max_shields 120, got {leviathan['max_shields']}"
        assert leviathan["max_energy"] == 120.0, f"Expected max_energy 120, got {leviathan['max_energy']}"
        print(f"SUCCESS: Leviathan stats correct - Hull: {leviathan['max_hull']}, Shields: {leviathan['max_shields']}, Energy: {leviathan['max_energy']}")
        
    def test_leviathan_player_creation(self):
        """Test creating a Player with leviathan ship class"""
        import sys
        sys.path.insert(0, '/app/backend')
        from game_engine import Player
        
        player = Player("test_id", "TestPilot", "leviathan")
        
        # Check base stats
        assert player.max_hull == 180.0
        assert player.max_shields == 120.0
        assert player.max_energy == 120.0
        assert player.ship_class == "leviathan"
        
        # Check Leviathan-specific cooldowns exist
        assert hasattr(player, 'bio_stasis_cd')
        assert hasattr(player, 'spore_cloud_cd')
        assert hasattr(player, 'mutalisk_cd')
        assert hasattr(player, 'bile_swell_cd')
        assert hasattr(player, 'bio_regen_timer')
        
        print(f"SUCCESS: Player created with Leviathan class - Stats and cooldowns correct")
        
    def test_leviathan_player_to_dict(self):
        """Test Player.to_dict() includes Leviathan-specific data"""
        import sys
        sys.path.insert(0, '/app/backend')
        from game_engine import Player
        
        player = Player("test_id", "TestPilot", "leviathan")
        player.spawn()
        
        data = player.to_dict()
        
        # Check Leviathan-specific fields in serialized data
        assert "bioStasisCd" in data
        assert "sporeCloudCd" in data
        assert "mutaliskCd" in data
        assert "bileSwellCd" in data
        assert "bioRegenTimer" in data
        assert data["shipClass"] == "leviathan"
        
        print(f"SUCCESS: Leviathan to_dict() includes all required fields")


class TestLeviathanAbilityConstants:
    """Test Leviathan ability constants are defined"""
    
    def test_bio_stasis_constants(self):
        """Test Bio-Stasis (Q) ability constants"""
        import sys
        sys.path.insert(0, '/app/backend')
        from game_engine import BIO_STASIS_RANGE, BIO_STASIS_DURATION, BIO_STASIS_CD, BIO_STASIS_ENERGY
        
        assert BIO_STASIS_RANGE == 60.0
        assert BIO_STASIS_DURATION == 2.5
        assert BIO_STASIS_CD == 12.0
        assert BIO_STASIS_ENERGY == 30.0
        print(f"SUCCESS: Bio-Stasis constants defined correctly")
        
    def test_spore_cloud_constants(self):
        """Test Spore Cloud (W) ability constants"""
        import sys
        sys.path.insert(0, '/app/backend')
        from game_engine import SPORE_CLOUD_RADIUS, SPORE_CLOUD_DURATION, SPORE_CLOUD_CD, SPORE_CLOUD_ENERGY, SPORE_CLOUD_SLOW_PCT
        
        assert SPORE_CLOUD_RADIUS == 35.0
        assert SPORE_CLOUD_DURATION == 5.0
        assert SPORE_CLOUD_CD == 18.0
        assert SPORE_CLOUD_ENERGY == 40.0
        assert SPORE_CLOUD_SLOW_PCT == 0.5
        print(f"SUCCESS: Spore Cloud constants defined correctly")
        
    def test_mutalisk_constants(self):
        """Test Mutalisk (E) ability constants"""
        import sys
        sys.path.insert(0, '/app/backend')
        from game_engine import MUTALISK_SPAWN_COUNT, MUTALISK_CD, MUTALISK_ENERGY, MUTALISK_HEALTH, MUTALISK_DAMAGE, MUTALISK_LIFETIME
        
        assert MUTALISK_SPAWN_COUNT == 3
        assert MUTALISK_CD == 30.0
        assert MUTALISK_ENERGY == 50.0
        assert MUTALISK_HEALTH == 40.0
        assert MUTALISK_DAMAGE == 8.0
        assert MUTALISK_LIFETIME == 12.0
        print(f"SUCCESS: Mutalisk constants defined correctly")
        
    def test_bile_swell_constants(self):
        """Test Bile Swell (R) ability constants"""
        import sys
        sys.path.insert(0, '/app/backend')
        from game_engine import BILE_SWELL_RADIUS, BILE_SWELL_DAMAGE, BILE_SWELL_ARMOR_DEBUFF, BILE_SWELL_CD, BILE_SWELL_ENERGY
        
        assert BILE_SWELL_RADIUS == 45.0
        assert BILE_SWELL_DAMAGE == 100.0
        assert BILE_SWELL_ARMOR_DEBUFF == 0.25
        assert BILE_SWELL_CD == 50.0
        assert BILE_SWELL_ENERGY == 85.0
        print(f"SUCCESS: Bile Swell constants defined correctly")
        
    def test_bio_regen_constants(self):
        """Test Bio-Regen passive constants"""
        import sys
        sys.path.insert(0, '/app/backend')
        from game_engine import BIO_REGEN_DELAY, BIO_REGEN_RATE
        
        assert BIO_REGEN_DELAY == 5.0
        assert BIO_REGEN_RATE == 10.0
        print(f"SUCCESS: Bio-Regen constants defined correctly")


class TestLeviathanClasses:
    """Test Leviathan-related classes (SporeCloud, Mutalisk)"""
    
    def test_spore_cloud_class(self):
        """Test SporeCloud class initialization and to_dict"""
        import sys
        sys.path.insert(0, '/app/backend')
        from game_engine import SporeCloud, SPORE_CLOUD_RADIUS, SPORE_CLOUD_DURATION
        
        cloud = SporeCloud("cloud_1", "owner_1", 10.0, 20.0)
        
        assert cloud.id == "cloud_1"
        assert cloud.owner_id == "owner_1"
        assert cloud.x == 10.0
        assert cloud.z == 20.0
        assert cloud.radius == SPORE_CLOUD_RADIUS
        assert cloud.timer == SPORE_CLOUD_DURATION
        
        data = cloud.to_dict()
        assert "id" in data
        assert "x" in data
        assert "z" in data
        assert "radius" in data
        assert "timer" in data
        
        print(f"SUCCESS: SporeCloud class works correctly")
        
    def test_mutalisk_class(self):
        """Test Mutalisk class initialization and to_dict"""
        import sys
        sys.path.insert(0, '/app/backend')
        from game_engine import Mutalisk, MUTALISK_HEALTH, MUTALISK_LIFETIME
        
        mutalisk = Mutalisk("muta_1", "owner_1", 10.0, 20.0)
        
        assert mutalisk.id == "muta_1"
        assert mutalisk.owner_id == "owner_1"
        assert mutalisk.x == 10.0
        assert mutalisk.z == 20.0
        assert mutalisk.health == MUTALISK_HEALTH
        assert mutalisk.alive == True
        assert mutalisk.lifetime == MUTALISK_LIFETIME
        
        data = mutalisk.to_dict()
        assert "id" in data
        assert "x" in data
        assert "z" in data
        assert "ownerId" in data
        assert "health" in data
        # Mutalisks should NOT have visible health bars per user requirement
        # The health is in the data but frontend should not display it
        
        print(f"SUCCESS: Mutalisk class works correctly")


class TestAllShipClasses:
    """Test all three ship classes are properly configured"""
    
    def test_all_ship_classes_exist(self):
        """Verify Vanguard, Dreadnought, and Leviathan are all defined"""
        import sys
        sys.path.insert(0, '/app/backend')
        from game_engine import SHIP_CLASSES
        
        assert "vanguard" in SHIP_CLASSES
        assert "dreadnought" in SHIP_CLASSES
        assert "leviathan" in SHIP_CLASSES
        assert len(SHIP_CLASSES) == 3
        
        print(f"SUCCESS: All 3 ship classes exist: {list(SHIP_CLASSES.keys())}")
        
    def test_vanguard_stats(self):
        """Verify Vanguard stats: Hull 100, Shields 100, Energy 100"""
        import sys
        sys.path.insert(0, '/app/backend')
        from game_engine import SHIP_CLASSES
        
        vanguard = SHIP_CLASSES["vanguard"]
        assert vanguard["max_hull"] == 100.0
        assert vanguard["max_shields"] == 100.0
        assert vanguard["max_energy"] == 100.0
        print(f"SUCCESS: Vanguard stats correct")
        
    def test_dreadnought_stats(self):
        """Verify Dreadnought stats: Hull 150, Shields 200, Energy 100"""
        import sys
        sys.path.insert(0, '/app/backend')
        from game_engine import SHIP_CLASSES
        
        dreadnought = SHIP_CLASSES["dreadnought"]
        assert dreadnought["max_hull"] == 150.0
        assert dreadnought["max_shields"] == 200.0
        assert dreadnought["max_energy"] == 100.0
        assert dreadnought["damage_reduction"] == 0.15
        print(f"SUCCESS: Dreadnought stats correct")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
