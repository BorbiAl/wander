CXX=g++
CXXFLAGS=-std=c++17 -O2 -Iinclude -Isrc
SOURCES=$(wildcard src/*.cpp)
TARGET=wander_engine

all: $(TARGET)

$(TARGET): $(SOURCES)
	$(CXX) $(CXXFLAGS) $(SOURCES) -o $(TARGET)

run: $(TARGET)
	./$(TARGET)

clean:
	rm -f $(TARGET)
