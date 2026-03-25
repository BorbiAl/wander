CXX=g++
CXXFLAGS=-std=c++2a -O2 -Iinclude -Isrc
LDFLAGS=

ifeq ($(OS),Windows_NT)
CXXFLAGS += -DWINVER=0x0A00 -D_WIN32_WINNT=0x0A00
LDFLAGS += -lws2_32
else
CXXFLAGS += -pthread
LDFLAGS += -pthread
endif

SOURCES=$(wildcard src/*.cpp)
TARGET=wander_engine

all: $(TARGET)

$(TARGET): $(SOURCES)
	$(CXX) $(CXXFLAGS) $(SOURCES) -o $(TARGET) $(LDFLAGS)

run: $(TARGET)
	./$(TARGET)

clean:
	rm -f $(TARGET)
